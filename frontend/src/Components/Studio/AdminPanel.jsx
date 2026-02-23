import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  getAllUsers,
  updateUserRole,
  getPlatformStats,
  getPendingWithdrawals,
  approveWithdrawal,
} from "../../api/monetization";
import PeopleIcon from "@mui/icons-material/People";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Skeleton from "react-loading-skeleton";

function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 1, pages: 1 });

  const User = useSelector((state) => state.user.user);
  const { user } = User;

  useEffect(() => {
    fetchData();
  }, [activeTab, pagination.page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const stats = await getPlatformStats();
        setPlatformStats(stats.stats);
      } else if (activeTab === "users") {
        const usersData = await getAllUsers(pagination.page, 20);
        setUsers(usersData.users);
        setPagination(usersData.pagination);
      } else if (activeTab === "withdrawals") {
        const withdrawals = await getPendingWithdrawals();
        setPendingWithdrawals(withdrawals.transactions || []);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success("User role updated");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleWithdrawal = async (transactionId, approved) => {
    try {
      await approveWithdrawal(transactionId, approved, approved ? null : "Rejected by admin");
      toast.success(approved ? "Withdrawal approved" : "Withdrawal rejected");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-data" style={{ left: "310px" }}>
        <Skeleton height={30} width={250} />
        <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
          <Skeleton height={100} width={200} />
          <Skeleton height={100} width={200} />
          <Skeleton height={100} width={200} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-data" style={{ left: "310px", padding: "20px" }}>
      <h2 style={{ marginBottom: "20px", color: "#fff" }}>
        <span style={{ marginRight: "10px" }}>⚙️</span>
        Admin Panel
      </h2>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("overview")}
          style={{
            padding: "10px 20px",
            background: activeTab === "overview" ? "#cc0000" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "10px 20px",
            background: activeTab === "users" ? "#cc0000" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("withdrawals")}
          style={{
            padding: "10px 20px",
            background: activeTab === "withdrawals" ? "#cc0000" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Withdrawals ({pendingWithdrawals.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && platformStats && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                background: "#1e1e1e",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <PeopleIcon style={{ color: "#2196f3" }} />
                <span style={{ color: "#aaa" }}>Total Users</span>
              </div>
              <h2 style={{ color: "#fff", margin: "10px 0" }}>
                {platformStats.totalUsers}
              </h2>
            </div>

            <div
              style={{
                background: "#1e1e1e",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <VideoLibraryIcon style={{ color: "#4caf50" }} />
                <span style={{ color: "#aaa" }}>Total Creators</span>
              </div>
              <h2 style={{ color: "#fff", margin: "10px 0" }}>
                {platformStats.totalCreators}
              </h2>
            </div>

            <div
              style={{
                background: "#1e1e1e",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <TrendingUpIcon style={{ color: "#ff9800" }} />
                <span style={{ color: "#aaa" }}>Total Videos</span>
              </div>
              <h2 style={{ color: "#fff", margin: "10px 0" }}>
                {platformStats.totalVideos}
              </h2>
            </div>

            <div
              style={{
                background: "#1e1e1e",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AttachMoneyIcon style={{ color: "#9c27b0" }} />
                <span style={{ color: "#aaa" }}>Total Earnings</span>
              </div>
              <h2 style={{ color: "#fff", margin: "10px 0" }}>
                ₹{platformStats.totalEarnings?.toFixed(2) || "0.00"}
              </h2>
            </div>
          </div>

          <div
            style={{
              background: "#1e1e1e",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: "15px" }}>
              Pending Withdrawals: {platformStats.pendingWithdrawals}
            </h3>
            <p style={{ color: "#aaa" }}>
              Go to Withdrawals tab to review and approve pending withdrawal requests.
            </p>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          <div
            style={{
              background: "#1e1e1e",
              padding: "20px",
              borderRadius: "8px",
              overflowX: "auto",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>All Users</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                    Name
                  </th>
                  <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                    Email
                  </th>
                  <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                    Role
                  </th>
                  <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                    Wallet
                  </th>
                  <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "10px", color: "#fff" }}>{u.name}</td>
                    <td style={{ padding: "10px", color: "#aaa" }}>{u.email}</td>
                    <td style={{ padding: "10px" }}>
                      <select
                        value={u.role || "viewer"}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        style={{
                          padding: "5px",
                          background: "#333",
                          color: "#fff",
                          border: "1px solid #444",
                          borderRadius: "4px",
                        }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="creator">Creator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px", color: "#4caf50" }}>
                      ₹{u.wallet_balance?.toFixed(2) || "0.00"}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <button
                        onClick={() => {
                          const newRole = u.role === "admin" ? "viewer" : "admin";
                          handleRoleChange(u._id, newRole);
                        }}
                        style={{
                          padding: "5px 10px",
                          background: "#2196f3",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginRight: "5px",
                        }}
                      >
                        {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                style={{
                  padding: "8px 16px",
                  background: pagination.page === 1 ? "#333" : "#2196f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: pagination.page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ color: "#aaa", padding: "8px" }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                style={{
                  padding: "8px 16px",
                  background: pagination.page === pagination.pages ? "#333" : "#2196f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: pagination.page === pagination.pages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === "withdrawals" && (
        <div>
          <div
            style={{
              background: "#1e1e1e",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>
              Pending Withdrawal Requests
            </h3>

            {pendingWithdrawals.length === 0 ? (
              <p style={{ color: "#aaa" }}>No pending withdrawals</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #333" }}>
                    <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                      Creator
                    </th>
                    <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                      Amount
                    </th>
                    <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                      Bank
                    </th>
                    <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                      Date
                    </th>
                    <th style={{ textAlign: "left", padding: "10px", color: "#aaa" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingWithdrawals.map((w) => (
                    <tr key={w._id} style={{ borderBottom: "1px solid #333" }}>
                      <td style={{ padding: "10px", color: "#fff" }}>
                        {w.creator_id?.name || "Unknown"}
                        <br />
                        <span style={{ color: "#aaa", fontSize: "12px" }}>
                          {w.creator_id?.email}
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "#4caf50", fontWeight: "bold" }}>
                        ₹{w.amount?.toFixed(2)}
                      </td>
                      <td style={{ padding: "10px", color: "#aaa" }}>
                        {w.creator_id?.bankDetails?.bankName || "N/A"}
                        <br />
                        <span style={{ fontSize: "12px" }}>
                          ****{w.creator_id?.bankDetails?.accountNumber?.slice(-4)}
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "#aaa" }}>
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <button
                          onClick={() => handleWithdrawal(w._id, true)}
                          style={{
                            padding: "8px 16px",
                            background: "#4caf50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            marginRight: "10px",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleWithdrawal(w._id, false)}
                          style={{
                            padding: "8px 16px",
                            background: "#f44336",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
