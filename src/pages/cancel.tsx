export default function Cancel() {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-700 text-center">
        <h1 className="text-4xl font-bold mb-4">Payment Cancelled</h1>
        <p className="text-lg">You can try again when you're ready.</p>
      </div>
    );
  }