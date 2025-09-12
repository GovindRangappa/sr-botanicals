'use client';

import usePlacesAutocomplete, {
  getGeocode,
  getZipCode,
  getDetails,
} from 'use-places-autocomplete';
import { useEffect } from 'react';

interface Props {
  onSelect: (address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }) => void;
}

export default function AddressAutocomplete({ onSelect }: Props) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    requestOptions: {
      componentRestrictions: { country: 'us' },
    },
  });

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();

    const results = await getGeocode({ address: description });
    const result = results[0];

    const street = result.address_components.find(c => c.types.includes('street_number'))?.long_name + ' ' +
                   result.address_components.find(c => c.types.includes('route'))?.long_name;

    const city = result.address_components.find(c => c.types.includes('locality'))?.long_name;
    const state = result.address_components.find(c => c.types.includes('administrative_area_level_1'))?.short_name;
    const zip = result.address_components.find(c => c.types.includes('postal_code'))?.long_name;

    onSelect({ street, city, state, zip });
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Start typing address..."
        className="w-full p-3 border rounded-md"
      />
      {status === 'OK' && (
        <ul className="absolute z-50 bg-white border w-full mt-1 rounded-md max-h-48 overflow-y-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
