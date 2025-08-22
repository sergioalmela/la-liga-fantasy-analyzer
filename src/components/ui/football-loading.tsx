interface BouncingBallLoaderProps {
  message?: string;
}

export function BouncingBallLoader({ message = "Loading..." }: BouncingBallLoaderProps) {
  return (
    <div className="text-center py-12">
      <div className="relative mx-auto w-12 h-12">
        <div className="absolute inset-0 animate-bounce text-4xl">
          ⚽
        </div>
      </div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}