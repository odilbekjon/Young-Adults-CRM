import { useTranslation } from "react-i18next";

const Exams = () => {
  const { t } = useTranslation();
  return (
    <div className="p-5">
        <h1 className="text-2xl ">{t("settings.ceo.general.exams.title")}</h1>

      <div>
          <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                {t("settings.ceo.general.exams.showActiveStudents")}
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                {t("settings.ceo.general.exams.showTrialStudents")}
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                {t("settings.ceo.general.exams.showArchivedStudents")}
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                {t("settings.ceo.general.exams.showFrozenStudents")}
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                {t("settings.ceo.general.exams.showDeletedStudents")}
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
          <button className="bg-blue-900 text-white py-2 px-4  mt-5 rounded-2xl ">{t("settings.ceo.general.exams.save")}</button>
      </div>
    </div>
  )
};

export default Exams;
