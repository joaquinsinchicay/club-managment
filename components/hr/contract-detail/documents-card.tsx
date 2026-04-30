import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBytes, formatIsoDate } from "@/lib/contract-detail-helpers";
import type { StaffContractAttachment } from "@/lib/services/staff-contract-attachment-service";
import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;

export function DocumentsCard({
  contractId,
  attachments,
  canMutate,
  uploadPending,
  onUpload,
  onDelete,
  onDownload,
}: {
  contractId: string;
  attachments: StaffContractAttachment[];
  canMutate: boolean;
  uploadPending: boolean;
  onUpload: (formData: FormData) => Promise<void>;
  onDelete: (attachmentId: string) => void;
  onDownload: (attachmentId: string) => void;
}) {
  return (
    <Card padding="comfortable">
      <CardHeader
        title={cdTexts.documents_title}
        description={cdTexts.documents_description}
        divider
      />
      <CardBody>
        {canMutate ? (
          <form action={onUpload} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="staff_contract_id" value={contractId} />
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.heic"
              className="min-h-11 w-full rounded-btn border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-btn file:border file:border-border file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-foreground"
            />
            <button
              type="submit"
              disabled={uploadPending}
              className={buttonClass({ variant: "primary", size: "md" })}
            >
              {uploadPending ? cdTexts.upload_pending : cdTexts.upload_cta}
            </button>
          </form>
        ) : null}

        {attachments.length === 0 ? (
          <EmptyState
            title={cdTexts.documents_empty_title}
            description={cdTexts.documents_empty_description}
            variant="dashed"
          />
        ) : (
          <ul className="grid gap-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3"
              >
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="break-all text-sm font-medium text-foreground">
                    {a.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(a.sizeBytes)} · {formatIsoDate(a.uploadedAt.slice(0, 10))}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDownload(a.id)}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    {cdTexts.download_cta}
                  </button>
                  {canMutate ? (
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      className={buttonClass({ variant: "destructive", size: "sm" })}
                    >
                      {cdTexts.delete_cta}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
