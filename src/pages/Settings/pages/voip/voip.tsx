export const Voip = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl ">VoIP settings</h1>

            <div className="mt-4">
                <span className="text-blue-500 border-2 border-solid p-2" >OnlinePBX</span>   
                <hr className="mt-2" />             
            </div>   

            <form className="flex  gap-3">
                <div className="mb-4">
                    <div className="w-[700px] mt-3">
                        <label htmlFor="onlinepbx-domain" className="block text-sm  text-gray-700">
                        OnlinePBX domain
                        </label>
                        <input
                            type="text"
                            id="onlinepbx-domain"
                            className="mt-1 p-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="pbx000000.onpbx.ru"
                        />
                    </div>
                    <div className="mt-3">
                        <label htmlFor="onlinepbx-api-key" className="block text-sm  text-gray-700 uppercase">
                           api key
                        </label>
                        <input
                            type="text"
                            id="onlinepbx-api-key"
                            className="mt-1 p-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="xBHHR9..."
                        />
                    </div>
                </div>
                <div className="mt-2">
                    <h2 className="">Description</h2>
                    <p className="w-[500px]">Для получения данных настройки телефонии обратитесь к тех.поддержке Modme или OnlinePBX.</p>
                </div>
            </form> 
        </div>
    )
}