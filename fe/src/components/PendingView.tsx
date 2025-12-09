interface Props {
    title: string;
    message: string;
}

export default function PendingView({ title, message }: Props) {
    return (
        <div className="max-w-md mx-auto bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">{title}</h3>
            <p className="text-neutral-400 text-sm">{message}</p>
        </div>
    );
}
