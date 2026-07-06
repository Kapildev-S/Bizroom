import AdminDashboard from './AdminDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'BizRoom | Admin Control Panel',
    description: 'Manage all business accounts and subscriptions.',
};

export default function AdminPage() {
    return (
        <div className="container mx-auto py-10 px-4">
            <AdminDashboard />
        </div>
    );
}
