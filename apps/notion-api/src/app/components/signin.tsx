'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";

import { getClientAuthorizationUrl } from '@/lib/auth';

export const SignIn = () => {

    const searchQuery = useSearchParams();

    const [value, setValue] = useState("");
    const [isInitialParam, setIsInitialParam] = useState(true);

    useEffect(() => {
        const access_code = searchQuery.get("code");
        if (access_code) {

            setIsInitialParam(true)
            let organization_id = localStorage.getItem('organization_id');
            setValue(organization_id!);

            const options = {
                method: 'POST',
                url: '/api/authentication/getAccessToken',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
                data: { access_code, organization_id },
            };
            
            axios
            .request(options)
            .then(function (response) {
                alert(response.data.notionToken);
            })
            .catch(function (error) {
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
                    type="text"
                    placeholder="Enter organization id"
                    className="border-[1px] border-gray-200 rounded-xl p-2 text-black bg-gray-50"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        localStorage.setItem('organization_id', e.target.value);
                    }}
                />
                {
                    value.length > 0 && !isInitialParam && 
                    <Link
                        href={`${getClientAuthorizationUrl()}`}
                        className="ml-1 border-[1px] border-gray-400 rounded-xl text-black p-4 hover:bg-gray-100 duration-300 w-fit"
                        >
                        Authenticate
                    </Link>
                }
            </div>
        </div>
    );
};