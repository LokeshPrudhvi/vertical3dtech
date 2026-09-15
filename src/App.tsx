import { Configurator } from '@/components/Configurator';
import { tentProduct } from '@/data/tentProduct';
import './styles.css';

export default function App() {
  return <Configurator product={tentProduct} />;
}
