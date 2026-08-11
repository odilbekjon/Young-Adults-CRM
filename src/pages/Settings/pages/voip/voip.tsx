import { useTranslation } from "react-i18next";

export const Voip = () => {
    const { t } = useTranslation();
    return (
        <div className="p-4">
            <h1 className="text-2xl ">{t("settings.voip.title")}</h1>

            <div className="mt-4">
                <span className="text-blue-500 border-2 border-solid p-2" >{t("settings.voip.onlinePbx")}</span>
                <hr className="mt-2" />
            </div>

            <form className="flex  gap-3">
                <div className="mb-4">
                    <div className="w-[700px] mt-3">
                        <label htmlFor="onlinepbx-domain" className="block text-sm  text-gray-700">
                        {t("settings.voip.domainLabel")}
                        </label>
                        <input
                            type="text"
                            id="onlinepbx-domain"
                            className="mt-1 p-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t("settings.voip.domainPlaceholder") as string}
                        />
                    </div>
                    <div className="mt-3">
                        <label htmlFor="onlinepbx-api-key" className="block text-sm  text-gray-700 uppercase">
                           {t("settings.voip.apiKeyLabel")}
                        </label>
                        <input
                            type="text"
                            id="onlinepbx-api-key"
                            className="mt-1 p-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t("settings.voip.apiKeyPlaceholder") as string}
                        />
                    </div>
                </div>
                <div className="mt-2">
                    <h2 className="">{t("settings.voip.descriptionHeading")}</h2>
                    <p className="w-[500px]">{t("settings.voip.descriptionText")}</p>
                </div>
            </form>
        </div>
    )
}