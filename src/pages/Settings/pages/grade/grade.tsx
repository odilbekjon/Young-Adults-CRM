import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BsCheckCircleFill } from "react-icons/bs";
import { FiMinus, FiPlus } from "react-icons/fi";

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      checked ? "bg-blue-500" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

export const Grade = () => {
  const { t } = useTranslation();
  const [maxScore, setMaxScore] = useState<5 | 10>(5);
  const [customScore, setCustomScore] = useState(5);

  const [allowPastDates, setAllowPastDates] = useState(false);
  const [allowNonTeaching, setAllowNonTeaching] = useState(false);
  const [showCenterRating, setShowCenterRating] = useState(false);
  const [showBranchRating, setShowBranchRating] = useState(false);

  const handleDecrement = () => {
    setCustomScore((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    setCustomScore((prev) => prev + 1);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1) setCustomScore(val);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">{t("settings.grade.title")}</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-4xl">
        {/* Attention Banner */}
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <BsCheckCircleFill className="text-green-500 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-green-700 font-semibold text-sm">{t("settings.grade.attentionTitle")}</p>
            <p className="text-green-700 text-sm mt-0.5">
              {t("settings.grade.attentionMessage")}
            </p>
          </div>
        </div>

        {/* Maximum Score */}
        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-2">{t("settings.grade.maxScoreLabel")}</p>
          <div className="flex items-center gap-2">
            {/* Preset Buttons */}
            <button
              onClick={() => setMaxScore(5)}
              className={`w-12 h-10 rounded-md text-sm font-medium transition-colors ${
                maxScore === 5
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              5
            </button>
            <button
              onClick={() => setMaxScore(10)}
              className={`w-12 h-10 rounded-md text-sm font-medium transition-colors ${
                maxScore === 10
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              10
            </button>

            {/* Custom Score Stepper */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden ml-1">
              <button
                onClick={handleDecrement}
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border-r border-gray-300"
              >
                <FiMinus size={16} />
              </button>
              <input
                type="number"
                value={customScore}
                onChange={handleCustomInput}
                className="w-14 h-10 text-center text-sm text-gray-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={handleIncrement}
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border-l border-gray-300"
              >
                <FiPlus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Settings */}
        <div className="space-y-5 mb-8">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-700">
              {t("settings.grade.allowPastDates")}
            </span>
            <Toggle
              checked={allowPastDates}
              onChange={() => setAllowPastDates((p) => !p)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-700">
              {t("settings.grade.allowNonTeaching")}
            </span>
            <Toggle
              checked={allowNonTeaching}
              onChange={() => setAllowNonTeaching((p) => !p)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-700">
              {t("settings.grade.showCenterRating")}
            </span>
            <Toggle
              checked={showCenterRating}
              onChange={() => setShowCenterRating((p) => !p)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-700">
              {t("settings.grade.showBranchRating")}
            </span>
            <Toggle
              checked={showBranchRating}
              onChange={() => setShowBranchRating((p) => !p)}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2.5 rounded-md text-sm font-medium transition-colors">
            {t("settings.grade.save")}
          </button>
        </div>
      </div>
    </div>
  );
};