import { useState } from "react";
import { MdSms, MdSave, MdClose, MdDelete } from "react-icons/md";
import { IoMdAdd, IoMdRemove } from "react-icons/io";

interface SmsType {
  id: string;
  label: string;
  enabled: boolean;
  days?: number;
  template: string;
  description: string;
  variables: string[];
}

interface SmsTemplate {
  id: string;
  text: string;
}

const VARIABLES = [
  { key: "(STUDENT)", desc: "Data activation in group" },
  { key: "(GROUP)", desc: "Group name" },
  { key: "(SUM)", desc: "Payment amount" },
  { key: "(LC)", desc: "The name of your learning centre" },
  { key: "(TEACHER)", desc: "Teacher's name" },
  { key: "(TIME)", desc: "Time" },
  { key: "(ROOM)", desc: "Room" },
  { key: "(DAYS)", desc: "Days" },
  { key: "(BALANCE)", desc: "Student's current balance" },
  { key: "(EX-ID)", desc: "Additional student ID" },
  { key: "(HOURS)", desc: "Start and end times for group classes" },
  { key: "(COURSE)", desc: "Name of the student's course" },
  { key: "(INDEBTEDNESS)", desc: "Student's debt" },
  { key: "(GROUP INFORMATION)", desc: "Group information" },
];

const SMS_TYPES: SmsType[] = [
  {
    id: "advance_payment",
    label: "Advance payment notification",
    enabled: true,
    template:
      "Assalomu Alaykum! 🎓 (STUDENT), sizning avans to'lovingiz qabul qilindi. Miqdor: (SUM). (LC)",
    description: "The message is sent when an advance payment notification is needed.",
    variables: ["(STUDENT)", "(SUM)", "(LC)"],
  },
  {
    id: "balance_not_enough",
    label: "Balance is not enough",
    enabled: true,
    days: 2,
    template:
      "Assalomu Alaykum! 🎓 (STUDENT), sizning hisobingizda mablag' yetarli emas. Joriy balans: (BALANCE). (LC)",
    description: "The message is sent when the student's balance is insufficient.",
    variables: ["(STUDENT)", "(BALANCE)", "(LC)"],
  },
  {
    id: "payment_done",
    label: "Payment was done",
    enabled: true,
    template:
      "Assalomu Alaykum! 🎓 (STUDENT), to'lovingiz muvaffaqiyatli amalga oshirildi. Miqdor: (SUM). (LC)",
    description: "The message is sent when a payment has been successfully made.",
    variables: ["(STUDENT)", "(SUM)", "(LC)"],
  },
  {
    id: "student_added",
    label: "Student added to group",
    enabled: true,
    template:
      "Assalomu Alaykum! 🎓 (STUDENT), siz (GROUP) guruhiga qo'shildingiz. O'qituvchi: (TEACHER). (LC)",
    description: "The message is sent when a student is added to a group.",
    variables: ["(STUDENT)", "(GROUP)", "(TEACHER)", "(LC)"],
  },
  {
    id: "student_birthday",
    label: "Student birthday",
    enabled: false,
    template:
      "Assalomu Alaykum! 🎂 (STUDENT), sizning tavvalud ayyomlaringiz bilan o'quv markazimiz nomidan tabriklaymiz! Sizga o'quv jarayonida omad, va har bir orzu qilgan niyatlaringizga etishingizni tilab qolamiz! (LC)",
    description:
      "The message is sent on the student's birthday. The message is sent at 9 am.",
    variables: ["(STUDENT)", "(LC)"],
  },
  {
    id: "absent_attendance",
    label: "Absent Attendance",
    enabled: false,
    template:
      "Assalomu Alaykum! 🎓 (STUDENT), bugun darsga kelmadingiz. (GROUP) guruhida (TIME) da dars bo'ldi. (LC)",
    description: "The message is sent when a student is absent from a class.",
    variables: ["(STUDENT)", "(GROUP)", "(TIME)", "(LC)"],
  },
];

const Toggle = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      enabled ? "bg-blue-500" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

export const SettingsSms = () => {
  const [activeTab, setActiveTab] = useState<"auto-sms" | "templates">("auto-sms");
  const [smsTypes, setSmsTypes] = useState<SmsType[]>(SMS_TYPES);
  const [selectedId, setSelectedId] = useState<string>("student_birthday");
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTemplateText, setNewTemplateText] = useState("");

  const selected = smsTypes.find((s) => s.id === selectedId)!;

  const newSymbolCount = newTemplateText.length;
  const newSmsCount = newSymbolCount > 0 ? Math.ceil(newSymbolCount / 160) : 0;

  const toggleSms = (id: string) => {
    setSmsTypes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const updateDays = (id: string, delta: number) => {
    setSmsTypes((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, days: Math.max(1, (s.days ?? 1) + delta) } : s
      )
    );
  };

  const updateTemplate = (id: string, value: string) => {
    setSmsTypes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, template: value } : s))
    );
  };

  const handleAddTemplate = () => {
    if (!newTemplateText.trim()) return;
    setTemplates((prev) => [
      ...prev,
      { id: Date.now().toString(), text: newTemplateText.trim() },
    ]);
    setNewTemplateText("");
    setDrawerOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const exampleText = selected.template
    .replace("(STUDENT)", "Ibrohim")
    .replace("(GROUP)", "Young Adults")
    .replace("(LC)", "Young Adults")
    .replace("(SUM)", "500 000 UZS")
    .replace("(BALANCE)", "0 UZS")
    .replace("(TEACHER)", "Sardor")
    .replace("(TIME)", "14:00")
    .replace("(ROOM)", "101");

  const symbolCount = exampleText.length;
  const smsCount = Math.ceil(symbolCount / 160);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-6">
        <MdSms className="text-2xl text-gray-700" />
        <h1 className="text-2xl font-semibold text-gray-800">Auto-SMS</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("auto-sms")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "auto-sms"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Auto-SMS
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          SMS templates
        </button>
      </div>

      {/* AUTO-SMS TAB */}
      {activeTab === "auto-sms" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 flex flex-col gap-2">
            <h2 className="text-base font-semibold text-gray-700 mb-2">SMS type</h2>
            {smsTypes.map((sms) => (
              <div
                key={sms.id}
                onClick={() => setSelectedId(sms.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  selectedId === sms.id
                    ? "border-blue-500 bg-white shadow-sm"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <span className="text-sm text-gray-700">{sms.label}</span>
                <div className="flex items-center gap-2">
                  {sms.days !== undefined && (
                    <div className="flex items-center gap-1 border border-gray-300 rounded px-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateDays(sms.id, 1); }}
                        className="text-blue-500 px-1 hover:text-blue-700"
                      >
                        <IoMdAdd size={14} />
                      </button>
                      <span className="text-sm w-4 text-center">{sms.days}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateDays(sms.id, -1); }}
                        className="text-blue-500 px-1 hover:text-blue-700"
                      >
                        <IoMdRemove size={14} />
                      </button>
                    </div>
                  )}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Toggle enabled={sms.enabled} onChange={() => toggleSms(sms.id)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-700 mb-3">
                SMS text: {selected.label}
              </h2>
              <textarea
                value={selected.template}
                onChange={(e) => updateTemplate(selected.id, e.target.value)}
                rows={6}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-700 mb-3">
                Example of a sent SMS
              </h2>
              <div className="bg-gray-100 rounded-md p-4 text-sm text-gray-600 min-h-[100px]">
                {exampleText}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {symbolCount} symbols ( ~ {smsCount} SMS )
              </p>
            </div>

            <div className="flex justify-end">
              <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors">
                <MdSave size={16} />
                Save
              </button>
            </div>
          </div>

          <div className="col-span-3">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Description</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <p className="text-sm text-gray-600 mb-4">{selected.description}</p>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Available variables:</h3>
              <p className="text-xs text-red-500 mb-3">
                Attentiveness! Using the variables works for{" "}
                <span className="font-bold">Auto-SMS</span>. These variables do not affect SMS sent
                manually using SMS shablons.
              </p>
              <ul className="space-y-1">
                {VARIABLES.map((v) => (
                  <li key={v.key} className="text-xs text-gray-600">
                    <span className="font-medium text-gray-800">{v.key}</span> - {v.desc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === "templates" && (
        <div>
          {/* ADD NEW button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setDrawerOpen(true)}
              className="bg-[#1b3d5e] hover:bg-[#162f4a] text-white text-sm font-bold px-7 py-2.5 rounded-full tracking-widest uppercase transition-colors shadow"
            >
              Add New
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-600 px-5 py-3">
                    SMS templates
                  </th>
                  <th className="text-left text-sm font-medium text-gray-600 px-5 py-3 w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-sm text-gray-400">
                      No templates yet. Click "Add New" to create one.
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-700">{t.text}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <MdDelete size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RIGHT-SIDE DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="relative w-96 bg-white h-full shadow-2xl flex flex-col z-50"
            style={{ animation: "slideInRight 0.25s ease-out" }}
          >
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Add SMS Template</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">SMS template</label>
                <textarea
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                  rows={6}
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded-md p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {newSymbolCount} symbols ( ~ {newSmsCount} SMS )
                </p>
              </div>

              <button
                onClick={handleAddTemplate}
                className="bg-[#1b3d5e] hover:bg-[#162f4a] text-white text-sm font-bold px-7 py-2.5 rounded-full w-fit transition-colors shadow"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};