import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { getVehicleCatalogMakes, getVehicleCatalogModels, registerDriver } from '../api';
import type { RegisterDriverRequest, VehicleCatalogMake, VehicleCatalogModel, VehicleRequest } from '../types';

export default function RegisterDriverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isModal = searchParams.get('modal') === '1';
  const registrationType = (searchParams.get('type') ?? 'individual').toLowerCase();
  const [error, setError] = useState('');
  const [includeVehicle, setIncludeVehicle] = useState(true);

  const [catalogMakes, setCatalogMakes] = useState<VehicleCatalogMake[]>([]);
  const [catalogModels, setCatalogModels] = useState<VehicleCatalogModel[]>([]);
  const [selectedMakeId, setSelectedMakeId] = useState<string>('');

  const [formData, setFormData] = useState<RegisterDriverRequest>({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    nationalId: '',
    licenseNumber: '',
    licenseExpiry: '',
    registrationFeePaid: false,
    registrationFeeAmountMwk: undefined,
    registrationFeeNotes: '',
    vehicle: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      licensePlate: '',
      licensePlateColor: 'blackyellow',
      vehicleType: 'sedan',
      capacity: 4,
    },
  });

  const mutation = useMutation({
    mutationFn: registerDriver,
    onSuccess: (driver) => {
      navigate(`/drivers/${driver.id}`);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to register driver');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const data: RegisterDriverRequest = {
      ...formData,
      vehicle: includeVehicle ? formData.vehicle : undefined,
    };

    mutation.mutate(data);
  };

  const updateField = (field: keyof RegisterDriverRequest, value: RegisterDriverRequest[keyof RegisterDriverRequest]) => {
    setFormData({ ...formData, [field]: value } as RegisterDriverRequest);
  };

  const updateVehicleField = (field: keyof VehicleRequest, value: string | number) => {
    setFormData({
      ...formData,
      vehicle: { ...formData.vehicle!, [field]: value },
    });
  };

  const normalizedMakes = useMemo(() => {
    return catalogMakes.map((m) => ({
      ...m,
      _nameLower: m.name.trim().toLowerCase(),
      _idLower: m.id.trim().toLowerCase(),
    }));
  }, [catalogMakes]);

  const modelOptions = useMemo(() => {
    const makeName = (formData.vehicle?.make ?? '').trim();
    const makePrefix = makeName ? `${makeName} ` : '';

    return catalogModels.map((m) => {
      const full = (m.model ?? '').trim();
      const display = makePrefix && full.toLowerCase().startsWith(makePrefix.toLowerCase())
        ? full.slice(makePrefix.length)
        : full;
      return {
        ...m,
        _fullLower: full.toLowerCase(),
        _display: display,
        _displayLower: display.toLowerCase(),
      };
    });
  }, [catalogModels, formData.vehicle?.make]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const makes = await getVehicleCatalogMakes();
        if (cancelled) return;
        setCatalogMakes(makes);
      } catch (e) {
        // Non-blocking: vehicle catalog is optional, fall back to manual entry.
        if (!cancelled) setCatalogMakes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!includeVehicle || !selectedMakeId) {
        setCatalogModels([]);
        return;
      }

      try {
        const models = await getVehicleCatalogModels(selectedMakeId);
        if (cancelled) return;
        setCatalogModels(models);
      } catch (e) {
        if (!cancelled) setCatalogModels([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [includeVehicle, selectedMakeId]);

  const handleClose = () => {
    navigate('/drivers');
  };

  const content = (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">Register New Driver</h1>
          <p className="text-sm text-gray-500 mt-1">Type: {registrationType}</p>
        </div>
        {isModal && (
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
          >
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="input"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="input"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="input"
                placeholder="driver@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                className="input"
                placeholder="+27 12 345 6789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National ID / Passport Number *
              </label>
              <input
                type="text"
                required
                value={formData.nationalId}
                onChange={(e) => updateField('nationalId', e.target.value)}
                className="input"
                placeholder="e.g., 9001015009087"
              />
              <p className="mt-1 text-sm text-gray-500">
                South African ID number or passport number for foreign nationals.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="input"
                placeholder="Min 8 characters"
                minLength={8}
              />
              <p className="mt-1 text-sm text-gray-500">
                The driver will use this password to log in to the driver app.
              </p>
            </div>
          </div>
        </div>

        {/* License Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">License Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Driver License Number *
              </label>
              <input
                type="text"
                required
                value={formData.licenseNumber}
                onChange={(e) => updateField('licenseNumber', e.target.value)}
                className="input"
                placeholder="DL1234567890"
              />
            </div>
            <div>
              <label htmlFor="licenseExpiry" className="block text-sm font-medium text-gray-700 mb-1">
                License Expiry Date *
              </label>
              <input
                id="licenseExpiry"
                type="date"
                required
                value={formData.licenseExpiry}
                onChange={(e) => updateField('licenseExpiry', e.target.value)}
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        {/* Registration Fee */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Registration Fee</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.registrationFeePaid}
                onChange={(e) => {
                  const paid = e.target.checked;
                  updateField('registrationFeePaid', paid);
                  if (!paid) {
                    updateField('registrationFeeAmountMwk', undefined);
                  }
                }}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Fee captured (MWK)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (MWK)
              </label>
              <input
                type="number"
                value={formData.registrationFeeAmountMwk ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateField('registrationFeeAmountMwk', raw === '' ? undefined : Number(raw));
                }}
                className="input"
                min={0}
                step={0.01}
                disabled={!formData.registrationFeePaid}
                placeholder="e.g., 5000"
              />
              <p className="mt-1 text-sm text-gray-500">
                If not captured, the driver remains pending.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={formData.registrationFeeNotes ?? ''}
                onChange={(e) => updateField('registrationFeeNotes', e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder="Receipt number, payment method, etc."
                disabled={!formData.registrationFeePaid}
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Vehicle Information</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeVehicle}
                onChange={(e) => setIncludeVehicle(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Add vehicle now</span>
            </label>
          </div>

          {includeVehicle && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Make *
                </label>
                <input
                  type="text"
                  list="vehicle-make-options"
                  required={includeVehicle}
                  value={formData.vehicle?.make || ''}
                  onChange={(e) => {
                    const next = e.target.value;
                    updateVehicleField('make', next);

                    const key = next.trim().toLowerCase();
                    const match = normalizedMakes.find((m) => m._nameLower === key || m._idLower === key);
                    setSelectedMakeId(match?.id ?? '');

                    // Reset model + inferred fields if make changes.
                    updateVehicleField('model', '');
                  }}
                  className="input"
                  placeholder="Toyota"
                />
                <datalist id="vehicle-make-options">
                  {catalogMakes.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  list="vehicle-model-options"
                  required={includeVehicle}
                  value={formData.vehicle?.model || ''}
                  onChange={(e) => {
                    const next = e.target.value;
                    updateVehicleField('model', next);

                    const key = next.trim().toLowerCase();
                    const match = modelOptions.find((m) => m._displayLower === key || m._fullLower === key);
                    if (match) {
                      updateVehicleField('vehicleType', match.vehicleType);
                      updateVehicleField('capacity', match.capacity);
                    }
                  }}
                  className="input"
                  placeholder="Corolla"
                />
                <datalist id="vehicle-model-options">
                  {modelOptions.map((m) => (
                    <option key={m.model} value={m._display} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="vehicleYear" className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <input
                  id="vehicleYear"
                  type="number"
                  required={includeVehicle}
                  value={formData.vehicle?.year || ''}
                  onChange={(e) => updateVehicleField('year', parseInt(e.target.value))}
                  className="input"
                  min={2000}
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color *
                </label>
                <input
                  type="text"
                  required={includeVehicle}
                  value={formData.vehicle?.color || ''}
                  onChange={(e) => updateVehicleField('color', e.target.value)}
                  className="input"
                  placeholder="White"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  required={includeVehicle}
                  value={formData.vehicle?.licensePlate || ''}
                  onChange={(e) => updateVehicleField('licensePlate', e.target.value.toUpperCase())}
                  className="input"
                  placeholder="ABC 123 GP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Plate Color *
                </label>
                <select
                  required={includeVehicle}
                  value={formData.vehicle?.licensePlateColor || 'blackyellow'}
                  onChange={(e) => updateVehicleField('licensePlateColor', e.target.value)}
                  className="input"
                >
                  <option value="blackyellow">Black / Yellow</option>
                  <option value="redwhite">Red / White</option>
                  <option value="blackwhite">Black / White</option>
                  <option value="bluewhite">Blue / White</option>
                </select>
              </div>
              <div>
                <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type *
                </label>
                <select
                  id="vehicleType"
                  required={includeVehicle}
                  value={formData.vehicle?.vehicleType || 'sedan'}
                  onChange={(e) => updateVehicleField('vehicleType', e.target.value)}
                  className="input"
                >
                  <option value="compact">Compact</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                  <option value="luxury">Luxury</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="vehicleCapacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Passenger Capacity *
                </label>
                <select
                  id="vehicleCapacity"
                  required={includeVehicle}
                  value={formData.vehicle?.capacity || 4}
                  onChange={(e) => updateVehicleField('capacity', parseInt(e.target.value))}
                  className="input"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n} passengers</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!includeVehicle && (
            <p className="text-sm text-gray-500">
              You can add vehicles later from the driver's detail page.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/drivers')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </>
            ) : (
              'Register Driver'
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-6">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
