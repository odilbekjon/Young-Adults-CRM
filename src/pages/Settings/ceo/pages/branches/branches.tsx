import { useState } from "react";
import {
  Drawer,
  TextField,
  Button,
} from "@mui/material";
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiPhone,
  FiMapPin,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

interface Branch {
  id: string;
  name: string;
  phone: string;
  address: string;
  archived: boolean;
}

const initialBranches: Branch[] = [
  {
    id: "1",
    name: "IELTS campus",
    phone: "998902957007",
    address: "Jarqo'rg'on tumani hokimiyati yonida",
    archived: false,
  },
  {
    id: "2",
    name: "Yangi Uzbekiston",
    phone: "998915785930",
    address: "Jarqo'rg'on, Yangi Uzbekiston",
    archived: false,
  },
];

// const formatPhoneInput = (raw: string) => {
//   const digits = raw.replace(/\D/g, "").slice(0, 9); // 9 ta raqam (998 dan keyin)
//   const p1 = digits.slice(0, 2);
//   const p2 = digits.slice(2, 5);
//   const p3 = digits.slice(5, 7);
//   const p4 = digits.slice(7, 9);

//   let result = "+998";
//   if (p1) result += p1;
//   if (p2) result += ` ${p2}`;
//   if (p3) result += ` ${p3}`;
//   if (p4) result += ` ${p4}`;
//   return result;
// };

export const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [tab, setTab] = useState<"faol" | "arxiv">("faol");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setPhone("+998 ");
    setAddress("");
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingId(branch.id);
    setName(branch.name);
    setPhone(branch.phone);
    setAddress(branch.address);
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleDelete = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const validate = () => {
    const newErrors: { [k: string]: string } = {};
    if (!name.trim()) newErrors.name = "Filial nomini kiriting";
    if (phone.replace(/\D/g, "").length < 12)
      newErrors.phone = "Telefon raqamini to'liq kiriting";
    if (!address.trim()) newErrors.address = "Manzilni kiriting";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const cleanPhone = phone.replace(/\D/g, "");

    if (editingId) {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? { ...b, name, phone: cleanPhone, address }
            : b
        )
      );
    } else {
      setBranches((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name,
          phone: cleanPhone,
          address,
          archived: false,
        },
      ]);
    }
    setModalOpen(false);
  };

  const visibleBranches = branches.filter((b) =>
    tab === "faol" ? !b.archived : b.archived
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm m-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Filiallar</h1>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Yangilash"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>

        <Button
          onClick={openCreateModal}
          startIcon={<FiPlus size={18} />}
          sx={{
            textTransform: "none",
            backgroundColor: "#FBBF24",
            color: "#1F2937",
            borderRadius: "10px",
            paddingX: "18px",
            paddingY: "10px",
            fontWeight: 600,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#F5B301", boxShadow: "none" },
          }}
          variant="contained"
        >
          Filial qo'shish
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-5 inline-flex rounded-xl bg-amber-50 p-1">
        <button
          type="button"
          onClick={() => setTab("faol")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "faol"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Faol
        </button>
        <button
          type="button"
          onClick={() => setTab("arxiv")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "arxiv"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Arxiv
        </button>
      </div>

      {/* Cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleBranches.map((branch) => (
          <div
            key={branch.id}
            className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">
                {branch.name}
              </span>
              <div className="flex items-center gap-3 text-gray-400">
                <button
                  type="button"
                  onClick={() => handleDelete(branch.id)}
                  className="hover:text-red-500 transition-colors"
                  aria-label="O'chirish"
                >
                  <FiTrash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(branch)}
                  className="hover:text-gray-700 transition-colors"
                  aria-label="Tahrirlash"
                >
                  <FiEdit2 size={16} />
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-white p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiPhone size={14} className="text-gray-400" />
                <span>{branch.phone}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <FiMapPin size={14} className="text-gray-400" />
                <span className="text-amber-600">{branch.address}</span>
              </div>
            </div>
          </div>
        ))}

        {visibleBranches.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-gray-400">
            {tab === "faol" ? "Faol filiallar yo'q" : "Arxivlangan filiallar yo'q"}
          </div>
        )}
      </div>

      {/* O'ng tomondan chiqadigan panel */}
      <Drawer
        anchor="right"
        open={modalOpen}
        onClose={closeModal}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420 },
            padding: "24px",
            borderTopLeftRadius: "16px",
            borderBottomLeftRadius: "16px",
          },
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? "Filialni tahrirlash" : "Filial qo'shish"}
          </h2>
          <button
            type="button"
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Yopish"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800">
              Filial nomi <span className="text-red-500">*</span>
            </label>
            <TextField
              fullWidth
              size="small"
              placeholder="Masalan: Educoin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": { borderColor: "#F5B301" },
                },
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800">
              Telefon raqami <span className="text-red-500">*</span>
            </label>
            <TextField
                type="number"
              fullWidth
              size="small"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={!!errors.phone}
              helperText={errors.phone}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": { borderColor: "#F5B301" },
                },
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800">
              Manzil <span className="text-red-500">*</span>
            </label>
            <TextField
              fullWidth
              size="small"
              placeholder="Masalan: Jarqo'rg'on tumani hokimiyati yonida"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={!!errors.address}
              helperText={errors.address}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": { borderColor: "#F5B301" },
                },
              }}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
          <Button
            onClick={closeModal}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              borderColor: "#E5E7EB",
              color: "#374151",
              paddingX: "18px",
              "&:hover": { borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" },
            }}
          >
            Bekor qilish
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              textTransform: "none",
              backgroundColor: "#FBBF24",
              color: "#1F2937",
              borderRadius: "10px",
              paddingX: "18px",
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { backgroundColor: "#F5B301", boxShadow: "none" },
            }}
          >
            Saqlash
          </Button>
        </div>
      </Drawer>
    </div>
  );
};