// Global type declarations for Google Maps API
interface Window {
  google?: {
    maps: {
      places: {
        Autocomplete: new (inputField: HTMLInputElement, options?: {
          types?: string[];
          componentRestrictions?: { country: string };
        }) => google.maps.places.Autocomplete;
      };
    };
  };
  googleMapsLoaded?: boolean;
  initGoogleMaps?: () => void;
}

declare namespace google.maps.places {
  interface Autocomplete {
    getPlace(): google.maps.places.PlaceResult;
    addListener(event: string, callback: () => void): void;
  }
  
  interface PlaceResult {
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }
}
