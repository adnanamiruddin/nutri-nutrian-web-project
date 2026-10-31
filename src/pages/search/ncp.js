import PageHeader from "@/components/ui/PageHeader";
import NcpDomainSearch from "@/components/search/NcpDomainSearch";

export default function Page() {
  return (
    <>
      <PageHeader title="Domain diagnosis gizi (NI, NC, NB)" description="Telusuri problem NCP/PAGT pada domain asupan (NI), klinis (NC), serta perilaku dan lingkungan (NB)." />
      <NcpDomainSearch />
    </>
  );
}
Page.title = "Domain diagnosis gizi";
