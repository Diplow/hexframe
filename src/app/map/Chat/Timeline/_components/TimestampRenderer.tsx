interface TimestampRendererProps {
  timestamp: Date;
}

export function TimestampRenderer({ timestamp }: TimestampRendererProps) {
  const formatTimestamp = () => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const short = `${hours}:${minutes}`;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const full = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    
    return { short, full };
  };

  const timestamps = formatTimestamp();
  
  return (
    <span className="text-xs text-muted-foreground" title={timestamps.full}>
      {timestamps.short}
    </span>
  );
}