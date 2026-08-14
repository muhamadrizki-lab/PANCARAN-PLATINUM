const fs = require('fs');
let code = fs.readFileSync('src/components/AdminUsers.tsx', 'utf8');

const approvalHistoryCode = `

      {/* TAB 5: APPROVAL HISTORY / MATRIX */}
      {activeTab === 'approval_history' && (() => {
        const approvalEvents = [
          ...registeredUsers
            .filter(u => u.status === 'Disetujui' || u.status === 'Ditolak')
            .map(u => ({
              id: \`reg-\${u.email}\`,
              type: 'Registrasi Akun (' + (u.userType === 'internal' ? 'Internal' : 'Eksternal') + ')',
              user: \`\${u.name} (\${u.email})\`,
              status: u.status,
              approvedBy: u.approvedBy || '-',
              approvedAt: u.approvedAt || u.createdAt
            })),
          ...biddingRequests
            .filter(req => req.status === 'Approved' || req.status === 'Rejected')
            .map(req => ({
              id: req.id,
              type: 'Akses Bidding',
              user: \`\${req.userName} (\${req.email})\`,
              status: req.status === 'Approved' ? 'Disetujui' : 'Ditolak',
              approvedBy: req.approvedBy || '-',
              approvedAt: req.approvedAt || req.updatedAt || req.createdAt
            })),
          ...refundRequests
            .filter(req => req.status === 'Approved' || req.status === 'Rejected')
            .map(req => ({
              id: req.id,
              type: 'Refund Jaminan',
              user: \`\${req.userName} (\${req.email})\`,
              status: req.status === 'Approved' ? 'Disetujui' : 'Ditolak',
              approvedBy: req.approvedBy || '-',
              approvedAt: req.approvedAt || req.updatedAt || req.createdAt
            }))
        ].sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Matrix Riwayat Approval
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Riwayat persetujuan pendaftaran, akses bidding, dan refund.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4 rounded-tl-lg">Waktu Approval</th>
                    <th className="p-4">Jenis Permintaan</th>
                    <th className="p-4">Nama / Email</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Di-Approve Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {approvalEvents.length > 0 ? (
                    approvalEvents.map((evt, idx) => (
                      <tr key={evt.id + '-' + idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-xs font-mono text-slate-500">
                          {(() => {
                            try {
                              const d = new Date(evt.approvedAt);
                              return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            } catch {
                              return evt.approvedAt;
                            }
                          })()}
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-800">{evt.type}</td>
                        <td className="p-4 text-xs">{evt.user}</td>
                        <td className="p-4">
                          <span className={\`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full \${
                            evt.status === 'Disetujui' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }\`}>
                            {evt.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-bold text-blue-700">{evt.approvedBy}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 text-xs font-semibold">
                        Belum ada riwayat approval.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
`;

code = code.replace('{/* Inline Proof of Transfer Modal */}', approvalHistoryCode + '\n      {/* Inline Proof of Transfer Modal */}');
fs.writeFileSync('src/components/AdminUsers.tsx', code);
