import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

const ReportsPage = () => {
  const { t } = useLanguage();
  const [complaintsByRoom, setComplaintsByRoom] = useState<any[]>([]);
  const [complaintsByType, setComplaintsByType] = useState<any[]>([]);
  const [cleaningByRoom, setCleaningByRoom] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      // Complaints by room
      const { data: complaints } = await supabase.from('complaints').select('room_id, rooms(room_name)');
      if (complaints) {
        const byRoom: Record<string, { name: string; count: number }> = {};
        complaints.forEach((c: any) => {
          const name = c.rooms?.room_name || 'Unknown';
          byRoom[name] = byRoom[name] || { name, count: 0 };
          byRoom[name].count++;
        });
        setComplaintsByRoom(Object.values(byRoom).sort((a, b) => b.count - a.count).slice(0, 10));

        // By type
        const byType: Record<string, number> = {};
        complaints.forEach((c: any) => { byType[c.complaint_type] = (byType[c.complaint_type] || 0) + 1; });
        setComplaintsByType(Object.entries(byType).map(([name, value]) => ({ name, value })));

        // Status counts
        const byStatus: Record<string, number> = {};
        complaints.forEach((c: any) => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
        setStatusCounts(Object.entries(byStatus).map(([name, value]) => ({ name, value })));
      }

      // Cleaning by room
      const { data: cleaning } = await supabase.from('cleaning_records').select('room_id, rooms(room_name)');
      if (cleaning) {
        const byRoom: Record<string, { name: string; count: number }> = {};
        cleaning.forEach((c: any) => {
          const name = c.rooms?.room_name || 'Unknown';
          byRoom[name] = byRoom[name] || { name, count: 0 };
          byRoom[name].count++;
        });
        setCleaningByRoom(Object.values(byRoom).sort((a, b) => b.count - a.count).slice(0, 10));
      }
    };
    fetch();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t.reports as string}</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">{t.most_complained_rooms as string}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={complaintsByRoom}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(215, 80%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t.common_complaint_types as string}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={complaintsByType} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {complaintsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t.cleaning_per_room as string}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cleaningByRoom}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(142, 72%, 35%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t.open_vs_closed as string}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusCounts} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusCounts.map((entry, i) => {
                      const colorMap: Record<string, string> = { new: '#2563eb', in_review: '#f59e0b', resolved: '#10b981', closed: '#6b7280' };
                      return <Cell key={i} fill={colorMap[entry.name] || COLORS[i % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
