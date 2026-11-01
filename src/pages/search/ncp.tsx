import NcpDomainSearch from "@/components/layouts/page-components/dashboard/search/NcpDomainSearch";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Domain Diagnosis Gizi (NI, NC, NB)"
        description="Telusuri problem NCP/PAGT pada domain asupan (NI), klinis (NC), serta perilaku dan lingkungan (NB)."
      />
      <NcpDomainSearch />
    </>
  );
}
