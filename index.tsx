import React from 'react';
import ReactDOM from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from './App';

// Your route setup
const routes = [
    {
        path: '/*',
        element: <App />,
    },
];

const router = createMemoryRouter(routes, {
    future: {
        // @ts-ignore
        v7_startTransition: true
    }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
