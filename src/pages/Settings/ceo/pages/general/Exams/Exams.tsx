
const Exams = () => {
  return (
    <div className="p-5"> 
        <h1 className="text-2xl ">Exams</h1>

      <div>
          <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                Exams: show active students
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                Exams: show students in a trial lesson
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                Exams: show archived students
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                Exams: show frozen students
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
           <div className="flex flex-col items-start mt-5">
              <label className="" htmlFor="showActiveStudents">
                Exams: show deleted students
              </label>
              <input className="mt-2" type="checkbox" id="showActiveStudents" />
          </div>
          <button className="bg-blue-900 text-white py-2 px-4  mt-5 rounded-2xl ">Save</button>
      </div>
    </div>
  )
};

export default Exams;