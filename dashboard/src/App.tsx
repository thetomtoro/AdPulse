import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Campaigns from './pages/Campaigns';
import Agent from './pages/Agent';
import Bidding from './pages/Bidding';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Campaigns />} />
        <Route path="/agent" element={<Agent />} />
        <Route path="/bidding" element={<Bidding />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}
