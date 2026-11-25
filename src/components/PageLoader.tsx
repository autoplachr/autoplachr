import { CarFront } from "lucide-react";

export function PageLoader() {
  return <div className="page-intro" aria-hidden="true">
    <div className="page-intro-lockup">
      <div className="page-intro-brand">
        <CarFront size={34} strokeWidth={2.25}/>
        <span>AUTOPLAC<span className="brand-domain">.hr</span></span>
      </div>
      <span className="page-intro-track"/>
    </div>
  </div>;
}
