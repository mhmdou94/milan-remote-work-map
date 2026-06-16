import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: 'Milan Remote Work Map',
  description: 'OpenStreetMap places in Milan that may be useful for remote workers.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
