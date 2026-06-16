import RemoteWorkMap from './components/RemoteWorkMap';
import { getPlaces } from '@/lib/places';

export const dynamic = 'force-dynamic';

export default function Home() {
  const data = getPlaces();

  return <RemoteWorkMap center={data.center} initialPlaces={data.places} />;
}
