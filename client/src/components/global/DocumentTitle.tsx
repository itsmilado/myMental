//src/components/global/DocumentTitle.tsx

import { useEffect } from "react";

const APP_TITLE = "myMental | Voice → Insight";

type DocumentTitleProps = {
    title?: string;
};

export const getDocumentTitle = (title?: string) =>
    title ? `myMental | ${title}` : APP_TITLE;

const DocumentTitle = ({ title }: DocumentTitleProps) => {
    useEffect(() => {
        document.title = getDocumentTitle(title);

        return () => {
            document.title = APP_TITLE;
        };
    }, [title]);

    return null;
};

export default DocumentTitle;
