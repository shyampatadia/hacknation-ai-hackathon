type DesertAlertProps = {
  district: string;
  message: string;
};

export function DesertAlert({ district, message }: DesertAlertProps) {
  return (
    <div className="desert-alert">
      <strong>{district}</strong>
      <p>{message}</p>
    </div>
  );
}

