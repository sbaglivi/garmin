interface Props {
    currentView: 'calendar' | 'weekly' | 'macro';
    onViewChange: (view: 'calendar' | 'weekly' | 'macro') => void;
    userEmail: string;
    onLogout: () => void;
}

export default function Navbar({ currentView, onViewChange, userEmail, onLogout }: Props) {
    const navItems = [
        { id: 'calendar' as const, label: 'Calendar' },
        { id: 'weekly' as const, label: 'Weekly' },
        { id: 'macro' as const, label: 'Plan' },
    ];

    return (
        <nav className="bg-neutral-900 border-b border-neutral-800">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    currentView === item.id
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-neutral-500">{userEmail}</span>
                        <button
                            onClick={onLogout}
                            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
