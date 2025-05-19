import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';

interface IpErrorProps {
    errorMessage: string;
    onRetry: () => void; // Función para intentar reconectar
}

const IpError: React.FC<IpErrorProps> = ({ errorMessage, onRetry }) => {
    return (
        <div className="flex justify-content-center align-items-center h-screen">
            <Card title="Error de Conexión" className="w-30">
                <p className="p-error">{errorMessage}</p>
                <p>Por favor, intenta de nuevo más tarde o desde otro dispositivo.</p>
                <Button
                    label="Reintentar"
                    icon="pi pi-refresh"
                    className="p-button-raised p-button-info"
                    onClick={onRetry}
                />
            </Card>
        </div>
    );
};

export default IpError;