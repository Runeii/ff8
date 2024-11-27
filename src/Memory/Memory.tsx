import { useEffect, useState } from "react";
import { MEMORY } from "../Field/Scripts/Script/handlers";

const Memory = () => {
  const [memory, setMemory] = useState<Record<number, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setMemory({...MEMORY});
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="memory">
    {Object.entries(memory).map(([address, value]) => (
      <div key={address}>
        {address}: {value}
      </div>
    ))}
    </div>
  );
}

export default Memory;