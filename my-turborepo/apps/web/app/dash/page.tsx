"use client";
import Image from "next/image";
import { Card } from "@repo/ui/card";
import { Code } from "@repo/ui/code";
import styles from "./page.module.css";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getCookie } from 'cookies-next';

export default function Page() {
    const [accessToken, setAccessToken] = useState('');
    const fetchData = async (token: string) => {
        try {
            const storedAccessToken = getCookie('myData');
            const response = await fetch('https://api.hubspot.com/settings/v3/users', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();

            // 3. Handle Expired Token
            if (response.status === 401) {
                console.log('Token expired, refreshing...');
                // Handle token refresh here
                // Example: await refreshAccessToken();
            }

            // Handle successful API response
            console.log('API Response:', data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };


    useEffect(() => {
        // 1. Check Local Storage for Access Token
        const storedAccessToken = getCookie('myData');
        if (storedAccessToken) {
            setAccessToken(storedAccessToken);
            // 2. Make API Request
            fetchData(storedAccessToken);
        }

        // 1. Check Local Storage for Refresh Token
        const storedRefreshToken = getCookie('myRefreshToken');
        if (storedRefreshToken) {
            setAccessToken(storedRefreshToken);
            // 2. Make API Request
            fetchData(storedRefreshToken);
        }
    }, []); // <-- Moved closing bracket to correct location




    return <h1>Hello, Dashboard Page!</h1>;
}
