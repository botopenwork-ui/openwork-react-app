import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import App from './App';
import { WalletProvider } from './context/WalletContext';

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<WalletProvider>
			<App />
		</WalletProvider>
	</React.StrictMode>
);
