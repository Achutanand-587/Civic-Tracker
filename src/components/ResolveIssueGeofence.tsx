import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Camera, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';

interface ResolveIssueGeofenceProps {
  ticketId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResolveIssueGeofence = ({ ticketId, open, onClose, onSuccess }: ResolveIssueGeofenceProps) => {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleGetGPS = async () => {
    setGpsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      if (accuracy > 50) {
        toast.error('GPS signal too weak. Please move to an open area and try again.');
        setGpsLoading(false);
        return;
      }

      setCoords({ lat: latitude, lng: longitude, accuracy });
      toast.success(`Location acquired (accuracy: ${Math.round(accuracy)}m)`);
    } catch (error: any) {
      console.error('Geolocation error:', error);
      toast.error('Failed to get GPS location. Please enable location access.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleResolve = async () => {
    if (!coords) {
      toast.error('Please get GPS location first');
      return;
    }

    if (!photoInputRef.current?.files?.[0]) {
      toast.error('Please capture a photo');
      return;
    }

    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/geofence/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticketId,
          technicianCoords: { lat: coords.lat, lng: coords.lng },
          accuracy: coords.accuracy,
          photoBlob: photoPreview
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('GPS signal too weak')) {
          toast.error('GPS signal too weak. Please move to an open area and try again.');
        } else if (data.status === 'geofence_block') {
          toast.error(`You are too far from the issue location (${data.distanceMeters}m away). Your location has been flagged for review.`);
        } else {
          toast.error(data.error || 'Failed to resolve issue');
        }
        return;
      }

      if (data.status === 'resolved') {
        toast.success('Issue resolved successfully!');
        onSuccess();
        onClose();
      } else if (data.status === 'geofence_block') {
        toast.error(data.message || 'You are outside the geofence. Your submission has been flagged for review.');
      }
    } catch (error: any) {
      console.error('Error resolving issue:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Issue with Geofence Verification</DialogTitle>
          <DialogDescription>
            Verify your location and capture a photo to resolve this issue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* GPS Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">GPS Location</h3>
            </div>

            {coords ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Latitude: {coords.lat.toFixed(6)}</p>
                <p>Longitude: {coords.lng.toFixed(6)}</p>
                <p>Accuracy: {Math.round(coords.accuracy)}m</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No location captured yet</p>
            )}

            <Button
              onClick={handleGetGPS}
              disabled={gpsLoading || loading}
              className="w-full"
              variant={coords ? 'outline' : 'default'}
            >
              {gpsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : coords ? (
                'Location Captured'
              ) : (
                'Get GPS Location'
              )}
            </Button>
          </div>

          {/* Photo Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Photo</h3>
            </div>

            {photoPreview && (
              <img
                src={photoPreview}
                alt="Resolution photo preview"
                className="w-full h-48 object-cover rounded"
              />
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            <Button
              onClick={() => photoInputRef.current?.click()}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              {photoPreview ? 'Change Photo' : 'Capture Photo'}
            </Button>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              You must be within 100m of the issue location to resolve it.
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!coords || !photoInputRef.current?.files?.[0] || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Resolve Issue'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
