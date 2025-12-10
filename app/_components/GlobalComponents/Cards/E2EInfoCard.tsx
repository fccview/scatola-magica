import Icon from "../Icons/Icon";

interface E2EInfoCardProps {
  shouldUseE2E?: boolean;
}

const E2EInfoCard = ({ shouldUseE2E }: E2EInfoCardProps) => {
  return (
    <>
      {shouldUseE2E && (
        <div className="mb-4 p-3 bg-primary-container text-on-primary-container rounded-lg text-sm flex items-center gap-2">
          <Icon icon="lock" size="md" />
          <span>
            Transfer Encryption enabled - files will be encrypted during
            transfer and unencrypted on arrival.
          </span>
        </div>
      )}
    </>
  );
};

export default E2EInfoCard;
