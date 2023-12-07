"use client";
import Image from "next/image";
import { Card } from "@repo/ui/card";
import { Code } from "@repo/ui/code";
import styles from "./page.module.css";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getCookie, getCookies, CookieValueTypes } from 'cookies-next';

export default function Page() {
    const [accessToken, setAccessToken] = useState('');

    useEffect(() => {
        const fetchData = async (token: CookieValueTypes) => {
            // try {
            const response = await fetch('https://api.hubspot.com/settings/v3/users', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();

            // 3. Handle Expired Token
            if (response.status === 401) {
                console.log('Token expired, refreshing...');
                // Handle token refresh here
                // Example: await refreshAccessToken();
            } else {
                console.log('API Response:', data);

            }

            // Handle successful API response
            console.log('API Response:', data);
            // } catch (error) {
            //     console.log('Error fetching data:', error);
            // }
        };


        const allCookies = getCookie('myData');
        console.log(allCookies);
        // fetchData(storedAccessToken);

    }, []); // <-- Moved closing bracket to correct location



    return <h1>Hello, Dashboard Page!</h1>;
}
