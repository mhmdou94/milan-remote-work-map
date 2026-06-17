import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: 'Milan Remote Work Map',
  description: 'A trusted, community-maintained map of laptop-friendly cafes, libraries, and coworking spaces in Milan.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
