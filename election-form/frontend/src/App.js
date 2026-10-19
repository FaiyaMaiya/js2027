import React, { useState, useEffect } from "react";

function App() {
  const [formData, setFormData] = useState({
    name: "", surname: "", idNumber: "", district: "",
    contact: "", dob: "", sex: "Male", residence: "", village: "", llg: "",
  });
  const [photo, setPhoto] = useState(null);
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const API = API_URL;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const loadRecords = async (p = 1) => {
    const params = new URLSearchParams({ page: p, perPage: 10, search });
    const response = await fetch(`${API}/getForms?${params.toString()}`);
    const data = await response.json();
    setRecords(data.records || []);
    setTotalPages(data.totalPages || 1);
    setPage(data.page || p);
  };

  const handleSubmit = async () => {
    const response = await fetch(`${API}/saveForm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, photo }),
    });
    const result = await response.json();
    setMessage(
      result.success && result.idNumber
        ? `${result.message} ID Number: ${result.idNumber}`
        : result.message || ""
    );
    if (result.success) {
      setFormData({
        name: "", surname: "", idNumber: "", district: "",
        contact: "", dob: "", sex: "Male", residence: "", village: "", llg: "",
      });
      setPhoto(null);
    }
    loadRecords(1);
  };

  useEffect(() => {
    loadRecords(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", background: "rgba(255,248,231,0.92)", borderRadius: 12, margin: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
      <h1>Election Form</h1>

      <h2>Personal Information</h2>
      <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} />
      <input name="surname" placeholder="Surname" value={formData.surname} onChange={handleChange} />
      <input name="idNumber" placeholder="ID Number (leave blank to auto-generate)" value={formData.idNumber} onChange={handleChange} />
      <input name="district" placeholder="District" value={formData.district} onChange={handleChange} />
      <input name="contact" placeholder="Contact" value={formData.contact} onChange={handleChange} />
      <input type="date" name="dob" value={formData.dob} onChange={handleChange} />
      <select name="sex" value={formData.sex} onChange={handleChange}>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>

      <h2>Photo</h2>
      <input type="file" accept="image/*" onChange={handlePhotoUpload} />
      {photo && <img src={photo} alt="Uploaded" width="150" />}

      <div>
        <button onClick={handleSubmit}>Save</button>
        {message && <span style={{ marginLeft: 10 }}>{message}</span>}
      </div>

      <h2>Saved Records</h2>
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && loadRecords(1)}
      />
      <button onClick={() => loadRecords(1)}>Search</button>

      <ul>
        {records.map((r) => (
          <li key={r.id}>
            {r.name} {r.surname} — {r.idNumber} — {r.district} — {r.contact}
          </li>
        ))}
      </ul>

      <div>
        <button disabled={page <= 1} onClick={() => loadRecords(page - 1)}>Prev</button>
        <span style={{ margin: "0 10px" }}>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => loadRecords(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export default App;
