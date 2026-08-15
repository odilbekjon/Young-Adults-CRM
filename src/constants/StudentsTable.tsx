import {
  FiPhone, FiKey, FiUser, FiMail, FiSend,
  FiBookOpen, FiMapPin, FiCreditCard,
} from "react-icons/fi";

export const ALL_COLUMNS = [
  { key: "photo" },
  { key: "name" },
  { key: "phone" },
  { key: "groups" },
  { key: "teachers" },
  { key: "training" },
  { key: "balance" },
  { key: "comment" },
];

export const CONTACT_ICONS = [
  { icon: <FiPhone size={16} />,    key: "phone" },
  { icon: <FiKey size={16} />,      key: "key" },
  { icon: <FiUser size={16} />,     key: "profile" },
  { icon: <FiMail size={16} />,     key: "email" },
  { icon: <FiSend size={16} />,     key: "telegram" },
  { icon: <FiBookOpen size={16} />, key: "education" },
  { icon: <FiMapPin size={16} />,   key: "location" },
  { icon: <FiCreditCard size={16} />, key: "card" },
];

export const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  blue:  { bg: "#dbeafe", color: "#1d4ed8" },
  green: { bg: "#dcfce7", color: "#15803d" },
  amber: { bg: "#fef3c7", color: "#92400e" },
};
