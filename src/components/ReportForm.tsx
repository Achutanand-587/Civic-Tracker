import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '@/contexts/IssueContext';
import { useAuth } from '@/contexts/AuthContext';
import { IssueCategory, CATEGORY_CONFIG } from '@/types/issue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, MapPin, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import LocationPicker from './LocationPicker';

const ReportForm = () => {
  const navigate = useNavigate();
  const { addIssue } = useIssues();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as IssueCategory | '',
    address: '',
    lat: 40.7128,
    lng: -74.006,
    severity: 'medium', // Default or empty?
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchAddress = async (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, address: 'Fetching address details...', lat, lng }));

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );
      const data = await response.json();

      let address = '';
      if (data.address) {
        const { road, house_number, suburb, city, town, village, county, state, postcode } = data.address;
        const place = city || town || village || suburb;
        const mainPart = [house_number, road].filter(Boolean).join(' ');
        const secondaryPart = [place, state, postcode].filter(Boolean).join(', ');

        if (mainPart) {
          address = `${mainPart}, ${secondaryPart}`;
        } else {
          address = data.display_name;
        }
      } else if (data.display_name) {
        address = data.display_name;
      }

      if (address) {
        setFormData(prev => ({ ...prev, address }));
      } else {
        toast.error('Could not find address for this location. Please enter manually.');
        setFormData(prev => ({ ...prev, address: '' }));
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      toast.error('Address lookup failed. Please enter the location manually.');
      setFormData(prev => ({ ...prev, address: '' }));
    }
  };

  const getCurrentLocation = useCallback((highAccuracy = true) => {
    setIsGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          await fetchAddress(lat, lng);
          setIsGettingLocation(false);
          toast.success(highAccuracy ? 'GPS Location acquired!' : 'Approximate location acquired (GPS failed)');
        },
        (error) => {
          console.warn('Geolocation error:', error);

          if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            // Retry with low accuracy (WiFi/Cell)
            toast.info('GPS signal weak, trying approximate location...');
            getCurrentLocation(false);
            return;
          }

          setIsGettingLocation(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              toast.error('Location permission denied. Please enable it in browser settings.');
              break;
            case error.POSITION_UNAVAILABLE:
              toast.error('Location information is unavailable. Please check your connection.');
              break;
            case error.TIMEOUT:
              toast.error('Location request timed out. Please try again.');
              break;
            default:
              toast.error('An unknown error occurred getting location.');
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 30000, // Longer timeout for backup attempt
          maximumAge: 0
        }
      );
    } else {
      setIsGettingLocation(false);
      toast.error('Geolocation is not supported by your browser.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.category || !formData.address || !imagePreview) {
      toast.error('Please fill in all required fields including location and photo.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addIssue({
        title: formData.title,
        description: formData.description,
        category: formData.category as IssueCategory,
        status: 'reported',
        location: {
          lat: formData.lat,
          lng: formData.lng,
          address: formData.address,
        },
        imageUrl: imagePreview || undefined,
        reportedBy: user?.displayName || user?.email || 'Anonymous User',
        upvotedBy: [],
        severity: (formData as any).severity as 'low' | 'medium' | 'high' | 'critical',
      });

      toast.success('Issue reported successfully! Thank you for contributing.');
      navigate('/issues');
    } catch (error: any) {
      toast.error(error.message || 'Failed to report issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Report an Issue</CardTitle>
          <CardDescription>
            Help improve your community by reporting local civic issues. Your report will be reviewed by municipal authorities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Photo *</Label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-secondary/50 transition-colors">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Take Photo</span>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-secondary/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload</span>
                  </div>
                </label>
              </div>

              {imagePreview && (
                <div className="mt-3 relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setImagePreview(null)}
                  >
                    Remove
                  </Button>
                  {(formData as any).severity && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs capitalize">
                      Severity: {(formData as any).severity}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: IssueCategory) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={(formData as any).severity}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide more details about the issue, including any relevant information that could help resolve it..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                maxLength={500}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="address">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  placeholder="Enter address or use GPS"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => getCurrentLocation()}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground px-1">
                <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">Lat: {formData.lat.toFixed(6)}</span>
                <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">Lng: {formData.lng.toFixed(6)}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Click the pin button to automatically detect your current location
              </p>

              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Confirm Location on Map</p>
                <LocationPicker
                  lat={formData.lat}
                  lng={formData.lng}
                  onLocationChange={fetchAddress}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="hero"
                disabled={isSubmitting || isGettingLocation}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div >
  );
};

export default ReportForm;
