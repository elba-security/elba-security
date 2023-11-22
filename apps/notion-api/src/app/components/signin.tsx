'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getClientAuthorizationUrl } from '@/lib/auth';

export const SignIn = () => {

    const searchQuery = useSearchParams();

    const [value, setValue] = useState("");
    const [isInitialParam, setIsInitialParam] = useState(true);

    useEffect(() => {
        const accessCode = searchQuery.get("code");
        if (accessCode) {

            setIsInitialParam(true)
            const organizationId = localStorage.getItem('organization_id');
            if (!organizationId) return

            setValue(organizationId);

            const options = {
                method: 'POST',
                url: '/api/authentication/getAccessToken',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
                data: { accessCode, organizationId },
            };
            
            axios
            .request(options)
            .then((response) => {
                console.log(response);
            })
            .catch((error) => {
                console.error(error);
            });
        } else {
            setIsInitialParam(false);
        }
    }, [searchQuery])
    
    return (
        <div className="flex items-center justify-center py-12">
            <div className="flex flex-col gap-4 items-center justify-center">
                {
                    !isInitialParam ? (
                        <p className="text-sm text-red-500">Please enter organization id before continuing</p>
                    ) : <p className="text-sm text-red-500">Welcome to elba</p>
                }
                <input
                    className="border-[1px] border-gray-200 rounded-xl p-2 text-black bg-gray-50"
                    onChange={(e) => {
                        setValue(e.target.value);
                        localStorage.setItem('organization_id', e.target.value);
                    }}
                    placeholder="Enter organization id"
                    type="text"
                    value={value}
                />
                {
                    value.length > 0 && !isInitialParam && 
                    <Link
                        className="ml-1 border-[1px] border-gray-400 rounded-xl text-black p-4 hover:bg-gray-100 duration-300 w-fit"
                        href={`${getClientAuthorizationUrl()}`}
                    >
                        Authenticate
                    </Link>
                }
            </div>
        </div>
    );
};