import { SignIn } from "./components/signin";

export default function Home() {
  return (
    <div className="min-h-full flex flex-col mt-20">
      <div className="flex flex-col items-center justify-center md:justify-start text-centergap-y-8 flex-1 px-6 pb-10">
        <SignIn />
      </div>
    </div>
  );
}
