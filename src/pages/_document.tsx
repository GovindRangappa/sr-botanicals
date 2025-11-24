// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  return (
    <Html lang="en">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Prata&display=swap"
          rel="stylesheet"
        />
        {googleMapsApiKey && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=initGoogleMaps`}
            async
            defer
          ></script>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.initGoogleMaps = function() {
                window.googleMapsLoaded = true;
                window.dispatchEvent(new Event('googlemapsloaded'));
              };
              window.googleMapsError = function() {
                console.error('Google Maps API failed to load. Please check your API key and ensure Maps JavaScript API and Places API are enabled.');
                window.dispatchEvent(new Event('googlemapserror'));
              };
              window.googleMapsLoaded = false;
              // Set timeout to detect if script never loads
              setTimeout(function() {
                if (!window.googleMapsLoaded && window.google && !window.google.maps) {
                  window.googleMapsError();
                }
              }, 10000);
            `,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
