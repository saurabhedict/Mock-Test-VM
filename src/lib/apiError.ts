type ApiErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export const readApiErrorMessage = (error: unknown, fallback: string) => {
  const message =
    typeof error === "object" && error !== null
      ? (error as ApiErrorShape).response?.data?.message
      : undefined;

  return typeof message === "string" && message.trim() ? message : fallback;
};
