"use client"

import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {

  const searchQuery = useSearchParams();

  const [value, setValue] = useState("");
  const [isInitialParam, setIsInitialParam] = useState(true);

  useEffect(() => {
    const id = searchQuery.get("organization_id");
    if (id) {
      setIsInitialParam(true)
      setValue(id)
    } else {
      setIsInitialParam(false);
    }
  }, [searchQuery])

  if(value.length > 0 ) {
    redirect(`/api/auth/zoom?organization_id=${value}`)
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col gap-4 items-center justify-center">
        {
          !isInitialParam ? (
            <p className="text-sm text-red-500">Please enter organization id before continuing</p>
          ) : <></>
        }
        <input
          type="text"
          placeholder="Enter organization id"
          className="border-[1px] border-gray-200 rounded-xl p-2 text-black bg-gray-50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {value.length > 0 && <Link
          href={`/api/auth/zoom?organization_id=${value}`}
          className="border-[1px] border-gray-400 rounded-xl text-black p-4 hover:bg-gray-100 duration-300 w-fit"
        >
          Authenticate
        </Link>}
      </div>
    </div>
  );
}