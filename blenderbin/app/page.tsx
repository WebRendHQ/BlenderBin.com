'use client';

import Button from "@/components/button";

export default function Home() {
  const handleClick = () => {
    alert("Button clicked!");
  };

  return (
    <div className="firstbutton">
      <h1 className="text-4xl font-bold mb-4">Welcome to BlenderBin</h1>
      <Button label="Click Me" onClick={handleClick} />
    </div>
  );
}
