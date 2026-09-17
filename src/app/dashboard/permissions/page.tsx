"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import {
  Shield,
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { useToast } from "@/app/_components/ui/toast";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { fieldControlClasses } from "@/app/_components/programmheft/field";

type Tab = "roles" | "users";

type ManagedRole = RouterOutputs["permissions"]["getAllRoles"][number];

const roleColumn = createDataTableColumnHelper<ManagedRole>();

export default function PermissionsPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [activeTab, setActiveTab] = useState<Tab>("roles");

  const { data: canManage, isLoading: canManageLoading } =
    api.permissions.canManage.useQuery(undefined, {
      enabled: !!session?.user,
    });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/permissions");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!canManageLoading && canManage === false && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [canManage, canManageLoading]);

  if (isPending || canManageLoading || canManage === undefined) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !canManage) {
    return null;
  }

  return (
    <DashboardPage
      title="Berechtigungsverwaltung"
      description="Verwalte benutzerdefinierte Rollen und Berechtigungen"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Berechtigungen" },
      ]}
    >
      <div className="border-ink dark:border-night-text mb-6 border-b-2">
        <nav className="-mb-0.5 flex gap-6 sm:gap-8">
          <button
            onClick={() => setActiveTab("roles")}
            className={`semi-condensed inline-flex items-center gap-2 border-b-[3px] px-1 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "roles"
                ? "border-primary text-ink dark:text-night-text"
                : "text-dark hover:border-ink hover:text-ink dark:text-night-muted dark:hover:border-night-text dark:hover:text-night-text border-transparent"
            }`}
          >
            <Shield className="h-4 w-4" />
            Rollen
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`semi-condensed inline-flex items-center gap-2 border-b-[3px] px-1 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "users"
                ? "border-primary text-ink dark:text-night-text"
                : "text-dark hover:border-ink hover:text-ink dark:text-night-muted dark:hover:border-night-text dark:hover:text-night-text border-transparent"
            }`}
          >
            <Users className="h-4 w-4" />
            Benutzerzuweisungen
          </button>
        </nav>
      </div>

      {activeTab === "roles" && <RolesTab />}
      {activeTab === "users" && <UsersTab />}
    </DashboardPage>
  );
}

function RolesTab() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissionKeys: [] as string[],
  });

  const utils = api.useUtils();
  const { data: roles, isLoading } = api.permissions.getAllRoles.useQuery();
  const { data: permissions } = api.permissions.getAllPermissions.useQuery();

  const createMutation = api.permissions.createRole.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      setFormData({ name: "", description: "", permissionKeys: [] });
      void utils.permissions.getAllRoles.invalidate();
    },
  });

  const updateMutation = api.permissions.updateRole.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setFormData({ name: "", description: "", permissionKeys: [] });
      void utils.permissions.getAllRoles.invalidate();
    },
  });

  const deleteMutation = api.permissions.deleteRole.useMutation({
    onSuccess: () => {
      void utils.permissions.getAllRoles.invalidate();
    },
  });

  const editingRole = roles?.find((r) => r.id === editingId);
  const isEditingSystemRole = editingRole?.isSystem ?? false;

  const isAdminRole = (roleName: string) => {
    const name = roleName.toLowerCase();
    return name === "administrator" || name === "admin";
  };

  const handleEdit = (role: NonNullable<typeof roles>[0]) => {
    setEditingId(role.id);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissionKeys: role.permissions.map((rp) => rp.permissionKey),
    });
  };

  const handleSave = () => {
    if (editingId) {
      if (isEditingSystemRole) {
        updateMutation.mutate({
          id: editingId,
          permissionKeys: formData.permissionKeys,
        });
      } else {
        updateMutation.mutate({
          id: editingId,
          name: formData.name,
          description: formData.description || null,
          permissionKeys: formData.permissionKeys,
        });
      }
    } else {
      createMutation.mutate(formData);
    }
  };

  const togglePermission = (permissionKey: string) => {
    setFormData({
      ...formData,
      permissionKeys: formData.permissionKeys.includes(permissionKey)
        ? formData.permissionKeys.filter((key) => key !== permissionKey)
        : [...formData.permissionKeys, permissionKey],
    });
  };

  const roleColumns = useMemo<DataTableColumn<ManagedRole>[]>(
    () =>
      roleColumn.columns([
        roleColumn.accessor((role) => role.name, {
          id: "name",
          header: "Name",
          meta: { alwaysVisible: true, cellClassName: "font-medium" },
          cell: ({ row }) => (
            <>
              {row.original.name}
              {row.original.isSystem && (
                <span className="text-dark dark:text-night-muted ml-2 text-xs">
                  (System)
                </span>
              )}
            </>
          ),
        }),
        roleColumn.accessor((role) => role.description ?? "", {
          id: "description",
          header: "Beschreibung",
          cell: ({ getValue }) => getValue() || "-",
        }),
        roleColumn.accessor((role) => (role.isSystem ? "System" : "Eigene"), {
          id: "kind",
          header: "Art",
          meta: { filterVariant: "set", label: "Art" },
        }),
        roleColumn.accessor((role) => role.permissions.length, {
          id: "permissionCount",
          header: "Berechtigungen",
          meta: { align: "right", filterVariant: "number" },
          cell: ({ getValue }) =>
            `${getValue()} Berechtigung${getValue() === 1 ? "" : "en"}`,
        }),
        roleColumn.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => {
            const role = row.original;
            if (role.isSystem && isAdminRole(role.name)) {
              return (
                <span className="text-dark dark:text-night-muted">Admin</span>
              );
            }
            if (editingId === role.id) {
              return (
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleSave}
                    aria-label="Speichern"
                    title="Speichern"
                    className="text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        name: "",
                        description: "",
                        permissionKeys: [],
                      });
                    }}
                    aria-label="Abbrechen"
                    title="Abbrechen"
                    className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            }
            return (
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => handleEdit(role)}
                  className="text-primary-ink dark:text-primary hover:underline"
                  title={
                    role.isSystem ? "Berechtigungen bearbeiten" : "Bearbeiten"
                  }
                >
                  <Edit className="h-4 w-4" />
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => {
                      if (confirm(`Rolle "${role.name}" wirklich löschen?`)) {
                        deleteMutation.mutate({ id: role.id });
                      }
                    }}
                    aria-label="Löschen"
                    title="Löschen"
                    className="text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="condensed text-ink dark:text-night-text text-xl font-bold">
          Rollen
        </h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "", permissionKeys: [] });
            setShowCreateModal(true);
          }}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neue Rolle
        </button>
      </div>

      <DataTable
        data={roles}
        columns={roleColumns}
        getRowId={(role) => role.id}
        isLoading={isLoading}
        rowNoun={["Rolle", "Rollen"]}
        searchPlaceholder="Rolle oder Beschreibung suchen…"
        initialSorting={[{ id: "name", desc: false }]}
        emptyState={
          <>
            <Shield className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <p className="text-dark dark:text-night-muted mt-4">
              Noch keine Rollen vorhanden
            </p>
          </>
        }
      />

      {/* Create/Edit Modal */}
      {(showCreateModal || editingId) && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
                {editingId
                  ? isEditingSystemRole
                    ? "Berechtigungen bearbeiten"
                    : "Rolle bearbeiten"
                  : "Neue Rolle"}
              </h3>
              <div className="space-y-4">
                {(!isEditingSystemRole || !editingId) && (
                  <>
                    <div>
                      <label className="text-ink dark:text-night-text mb-1 block text-sm font-semibold">
                        Name{" "}
                        <span
                          aria-hidden
                          className="text-primary-ink dark:text-primary"
                        >
                          *
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="z.B. Content Manager"
                        className={fieldControlClasses}
                      />
                    </div>
                    <div>
                      <label className="text-ink dark:text-night-text mb-1 block text-sm font-semibold">
                        Beschreibung
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className={fieldControlClasses}
                      />
                    </div>
                  </>
                )}
                {isEditingSystemRole && editingId && (
                  <div className="on-orange bg-primary text-ink p-3 text-sm">
                    <p className="font-semibold">
                      Systemrolle: {formData.name}
                    </p>
                    <p className="mt-1 text-xs">
                      Name und Beschreibung können nicht geändert werden.
                      Berechtigungen können angepasst werden.
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-ink dark:text-night-text mb-2 block text-sm font-semibold">
                    Berechtigungen
                  </label>
                  <div className="border-rule dark:border-night-rule max-h-64 overflow-y-auto border p-4">
                    {permissions && permissions.length > 0 ? (
                      <div className="space-y-2">
                        {permissions.map((perm) => (
                          <label
                            key={perm.key}
                            className="text-ink dark:text-night-text flex flex-wrap items-center gap-x-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissionKeys.includes(
                                perm.key,
                              )}
                              onChange={() => togglePermission(perm.key)}
                              className="border-ink checked:bg-ink dark:border-night-text dark:checked:bg-night-text bg-paper dark:bg-night h-4 w-4 shrink-0 cursor-pointer appearance-none border-2"
                            />
                            <span className="font-medium">{perm.name}</span>
                            <span className="text-dark dark:text-night-muted break-all">
                              ({perm.key})
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-dark dark:text-night-muted text-sm">
                        Keine Berechtigungen verfügbar
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                    setFormData({
                      name: "",
                      description: "",
                      permissionKeys: [],
                    });
                  }}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule inline-flex min-h-11 items-center border-2 px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editingId && !formData.name}
                  className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Speichern
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </div>
  );
}

type UserOption = {
  id: string;
  displayName: string | null;
  email: string;
  username: string | null;
};

function UserSearchDropdown({
  users,
  selectedUserId,
  onSelect,
  placeholder = "Benutzer suchen...",
}: {
  users?: UserOption[];
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  placeholder?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUser = users?.find((u) => u.id === selectedUserId);

  const filteredUsers =
    users?.filter((user) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const displayName = user.displayName?.toLowerCase() || "";
      const email = user.email.toLowerCase();
      const username = user.username?.toLowerCase() || "";
      return (
        displayName.includes(query) ||
        email.includes(query) ||
        username.includes(query)
      );
    }) || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (userId: string) => {
    onSelect(userId);
    setIsOpen(false);
    setSearchQuery("");
    inputRef.current?.blur();
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    onSelect(null);
    setSearchQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="relative">
          <Search className="text-dark dark:text-night-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={
              isOpen
                ? searchQuery
                : selectedUser?.displayName || selectedUser?.email || ""
            }
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              if (selectedUser) {
                setSearchQuery("");
              }
            }}
            placeholder={selectedUser && !isOpen ? undefined : placeholder}
            className={cn(fieldControlClasses, "py-2 pr-10 pl-10")}
          />
          {selectedUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              aria-label="Auswahl aufheben"
              className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!selectedUser && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Liste schließen" : "Liste öffnen"}
              className="text-dark dark:text-night-muted absolute top-1/2 right-2 -translate-y-1/2"
            >
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {isOpen && (
          <div className="border-ink dark:border-night-text bg-paper dark:bg-night absolute z-50 mt-1 max-h-64 w-full overflow-auto border-2">
            {filteredUsers.length > 0 ? (
              <div className="py-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm",
                      selectedUserId === user.id
                        ? "on-orange bg-primary text-ink"
                        : "text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule",
                    )}
                  >
                    <div className="font-medium">
                      {user.displayName || user.email}
                    </div>
                    {user.displayName && (
                      <div
                        className={cn(
                          "text-xs",
                          selectedUserId === user.id
                            ? "text-ink"
                            : "text-dark dark:text-night-muted",
                        )}
                      >
                        {user.email}
                      </div>
                    )}
                    {user.username && (
                      <div
                        className={cn(
                          "text-xs",
                          selectedUserId === user.id
                            ? "text-ink"
                            : "text-dark dark:text-night-muted",
                        )}
                      >
                        @{user.username}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-dark dark:text-night-muted px-4 py-8 text-center text-sm">
                {searchQuery.trim()
                  ? "Keine Benutzer gefunden"
                  : "Tippen Sie, um zu suchen..."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab() {
  const toast = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<
    string[]
  >([]);

  const utils = api.useUtils();
  const { data: users } = api.permissions.getAllUsers.useQuery();
  const { data: roles } = api.permissions.getAllRoles.useQuery();
  const { data: permissions } = api.permissions.getAllPermissions.useQuery();
  const { data: userPermissions } = api.permissions.getUserPermissions.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId },
  );

  // Effective permission preview
  const { data: preview } =
    api.permissions.previewEffectivePermissions.useQuery(
      {
        userId: selectedUserId!,
        roleIds: selectedRoleIds,
        directPermissions: selectedPermissionKeys.map((key) => ({
          permissionKey: key,
          granted: true,
        })),
      },
      { enabled: !!selectedUserId },
    );

  const assignRolesMutation = api.permissions.assignRolesToUser.useMutation({
    onSuccess: () => {
      toast.success("Rollen erfolgreich zugewiesen");
      void utils.permissions.getUserPermissions.invalidate();
      void utils.permissions.previewEffectivePermissions.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler beim Zuweisen der Rollen: " + error.message);
    },
  });

  const assignPermissionsMutation =
    api.permissions.assignPermissionsToUser.useMutation({
      onSuccess: () => {
        toast.success("Berechtigungen erfolgreich zugewiesen");
        void utils.permissions.getUserPermissions.invalidate();
        void utils.permissions.previewEffectivePermissions.invalidate();
      },
      onError: (error) => {
        toast.error(
          "Fehler beim Zuweisen der Berechtigungen: " + error.message,
        );
      },
    });

  const derivedRoleIds = useMemo(
    () =>
      userPermissions
        ? userPermissions.customRoles.map((ura) => ura.role.id)
        : [],
    [userPermissions],
  );

  const derivedPermissionKeys = useMemo(
    () =>
      userPermissions
        ? userPermissions.userPermissions
            .filter((up) => up.granted)
            .map((up) => up.permissionKey)
        : [],
    [userPermissions],
  );

  useEffect(() => {
    if (userPermissions) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state from async query data
      setSelectedRoleIds((prev) => {
        const newIds = derivedRoleIds;
        if (
          prev.length !== newIds.length ||
          !prev.every((id, idx) => id === newIds[idx])
        ) {
          return newIds;
        }
        return prev;
      });

      setSelectedPermissionKeys((prev) => {
        const newKeys = derivedPermissionKeys;
        if (
          prev.length !== newKeys.length ||
          !prev.every((key, idx) => key === newKeys[idx])
        ) {
          return newKeys;
        }
        return prev;
      });
    }
  }, [userPermissions, derivedRoleIds, derivedPermissionKeys]);

  const handleSelectUser = (userId: string | null) => {
    setSelectedUserId(userId);
    setSelectedRoleIds([]);
    setSelectedPermissionKeys([]);
  };

  const handleSaveRoles = () => {
    if (!selectedUserId) return;
    assignRolesMutation.mutate({
      userId: selectedUserId,
      roleIds: selectedRoleIds,
    });
  };

  const handleSavePermissions = () => {
    if (!selectedUserId) return;
    assignPermissionsMutation.mutate({
      userId: selectedUserId,
      permissions: selectedPermissionKeys.map((permissionKey) => ({
        permissionKey,
        granted: true,
      })),
    });
  };

  const hasAdminRole =
    roles?.some(
      (role) =>
        (role.name.toLowerCase() === "administrator" ||
          role.name.toLowerCase() === "admin") &&
        (selectedRoleIds.includes(role.id) ||
          userPermissions?.customRoles.some((ura) => ura.role.id === role.id)),
    ) ?? false;

  // Group preview permissions by category
  const groupedPreview = useMemo(() => {
    if (!preview || !permissions) return null;
    const groups: Record<
      string,
      Array<{
        key: string;
        name: string;
        sources: string[];
        granted: boolean;
      }>
    > = {};

    for (const perm of permissions) {
      const detail = preview.permissionSources[perm.key];
      if (!detail) continue;
      const cat = perm.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({
        key: perm.key,
        name: perm.name,
        sources: detail.sources,
        granted: detail.granted,
      });
    }

    return groups;
  }, [preview, permissions]);

  return (
    <div className="space-y-6">
      <h2 className="condensed text-ink dark:text-night-text text-xl font-bold">
        Benutzerzuweisungen
      </h2>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left Column: User Selection + Assignment */}
        <div className="space-y-4">
          <div>
            <label className="text-ink dark:text-night-text mb-2 block text-sm font-semibold">
              Benutzer auswählen
            </label>
            <UserSearchDropdown
              users={users}
              selectedUserId={selectedUserId}
              onSelect={handleSelectUser}
              placeholder="Benutzer suchen..."
            />
          </div>

          {selectedUserId && (
            <>
              {/* Role Assignment */}
              <div className="border-rule dark:border-night-rule border p-4">
                <h3 className="condensed text-ink dark:text-night-text mb-3 text-sm font-bold">
                  Rollen zuweisen
                </h3>
                {hasAdminRole && (
                  <div className="border-ink dark:border-night-text mb-3 border-2 p-3 text-sm">
                    <p className="text-ink dark:text-night-text font-semibold">
                      Admin-Rolle zugewiesen
                    </p>
                    <p className="text-dark dark:text-night-muted mt-1 text-xs">
                      Die Admin-Rolle gewährt automatisch alle Berechtigungen.
                      Andere Rollen sind nicht mehr erforderlich.
                    </p>
                  </div>
                )}
                {roles && roles.length > 0 ? (
                  <div className="space-y-2">
                    {roles.map((role) => {
                      const isAdminRole =
                        role.name.toLowerCase() === "administrator" ||
                        role.name.toLowerCase() === "admin";
                      const isDisabled = hasAdminRole && !isAdminRole;

                      return (
                        <label
                          key={role.id}
                          className={`flex min-h-11 items-center gap-2 text-sm ${
                            isDisabled
                              ? "cursor-not-allowed opacity-50"
                              : "text-ink dark:text-night-text"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.includes(role.id)}
                            disabled={isDisabled}
                            onChange={(e) => {
                              if (isDisabled) return;

                              if (e.target.checked) {
                                if (isAdminRole) {
                                  setSelectedRoleIds([role.id]);
                                  setSelectedPermissionKeys([]);
                                } else {
                                  const adminRole = roles?.find(
                                    (r) =>
                                      r.name.toLowerCase() ===
                                        "administrator" ||
                                      r.name.toLowerCase() === "admin",
                                  );
                                  const newRoleIds = adminRole
                                    ? selectedRoleIds.filter(
                                        (id) => id !== adminRole.id,
                                      )
                                    : selectedRoleIds;
                                  setSelectedRoleIds([...newRoleIds, role.id]);
                                }
                              } else {
                                setSelectedRoleIds(
                                  selectedRoleIds.filter(
                                    (id) => id !== role.id,
                                  ),
                                );
                              }
                            }}
                            className={`border-ink checked:bg-ink dark:border-night-text dark:checked:bg-night-text bg-paper dark:bg-night h-4 w-4 shrink-0 cursor-pointer appearance-none border-2 ${
                              isDisabled ? "cursor-not-allowed opacity-50" : ""
                            }`}
                          />
                          <span>{role.name}</span>
                        </label>
                      );
                    })}
                    <button
                      onClick={handleSaveRoles}
                      className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink mt-3 inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      Rollen speichern
                    </button>
                  </div>
                ) : (
                  <p className="text-dark dark:text-night-muted text-sm">
                    Keine Rollen verfügbar
                  </p>
                )}
              </div>

              {/* Direct Permission Assignment */}
              <div className="border-rule dark:border-night-rule border p-4">
                <h3 className="condensed text-ink dark:text-night-text mb-3 text-sm font-bold">
                  Direkte Berechtigungen
                </h3>
                {hasAdminRole && (
                  <div className="border-ink dark:border-night-text mb-3 border-2 p-3 text-sm">
                    <p className="text-ink dark:text-night-text font-semibold">
                      Admin-Rolle zugewiesen
                    </p>
                    <p className="text-dark dark:text-night-muted mt-1 text-xs">
                      Die Admin-Rolle gewährt automatisch alle Berechtigungen.
                      Einzelne Berechtigungen können nicht mehr zugewiesen
                      werden.
                    </p>
                  </div>
                )}
                {permissions && permissions.length > 0 ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {permissions.map((perm) => (
                      <label
                        key={perm.key}
                        className={`flex min-h-11 items-center gap-2 text-sm ${
                          hasAdminRole
                            ? "cursor-not-allowed opacity-50"
                            : "text-ink dark:text-night-text"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissionKeys.includes(perm.key)}
                          disabled={hasAdminRole}
                          onChange={(e) => {
                            if (hasAdminRole) return;
                            if (e.target.checked) {
                              setSelectedPermissionKeys([
                                ...selectedPermissionKeys,
                                perm.key,
                              ]);
                            } else {
                              setSelectedPermissionKeys(
                                selectedPermissionKeys.filter(
                                  (key) => key !== perm.key,
                                ),
                              );
                            }
                          }}
                          className={`border-ink checked:bg-ink dark:border-night-text dark:checked:bg-night-text bg-paper dark:bg-night h-4 w-4 shrink-0 cursor-pointer appearance-none border-2 ${
                            hasAdminRole ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        />
                        <span className="font-medium">{perm.name}</span>
                        <span className="text-dark dark:text-night-muted">
                          ({perm.key})
                        </span>
                      </label>
                    ))}
                    <button
                      onClick={handleSavePermissions}
                      disabled={hasAdminRole}
                      className={`mt-3 inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-sm font-semibold transition-colors ${
                        hasAdminRole
                          ? "border-rule dark:border-night-rule text-dark dark:text-night-muted cursor-not-allowed border-2"
                          : "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink"
                      }`}
                    >
                      Berechtigungen speichern
                    </button>
                  </div>
                ) : (
                  <p className="text-dark dark:text-night-muted text-sm">
                    Keine Berechtigungen verfügbar
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Effective Permission Preview */}
        {/*
         * Klebender Versatz aus `--main-padding-top` (Nav- und ggf.
         * Bannerhöhe, auf <main> gesetzt): eine feste Zahl wie `top-4` stimmt
         * nicht mehr, sobald das Beta-Banner erscheint oder der Breakpoint
         * die Navigationshöhe ändert. `dashboard-sticky-shell-top` liefert
         * den Versatz als Klasse (Kommas in Tailwinds Arbitrary-Werten
         * zerbrechen sonst den JIT-Parser); die Maximalhöhen hängen an
         * derselben Variable, damit Kopf und Liste konsistent mitwandern.
         */}
        <div
          className="dashboard-sticky-shell-top border-rule dark:border-night-rule bg-paper dark:bg-night sticky overflow-hidden border p-4"
          style={{
            maxHeight:
              "calc(100vh - (var(--main-padding-top, 9rem) + var(--dashboard-sticky-top-extra)) - 1.5rem)",
          }}
        >
          <h3 className="condensed text-ink dark:text-night-text mb-3 flex items-center gap-2 text-sm font-bold">
            <Eye className="h-4 w-4" />
            Effektive Berechtigungen
          </h3>
          {selectedUserId && groupedPreview ? (
            <div
              className="space-y-4 overflow-y-auto"
              style={{
                maxHeight:
                  "calc(100vh - (var(--main-padding-top, 9rem) + var(--dashboard-sticky-top-extra)) - 4.5rem)",
              }}
            >
              {Object.entries(groupedPreview).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-dark dark:text-night-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {perms.map((perm) => (
                      <div
                        key={perm.key}
                        className={`px-3 py-2 text-sm ${
                          perm.granted
                            ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{perm.name}</span>
                          {perm.granted ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {perm.sources.map((source, i) => (
                            <span
                              key={i}
                              className={`inline-block px-1.5 py-0.5 text-xs ${
                                perm.granted
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                              }`}
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(groupedPreview).length === 0 && (
                <p className="text-dark dark:text-night-muted text-sm">
                  Keine Berechtigungen mit aktueller Auswahl
                </p>
              )}
            </div>
          ) : (
            <p className="text-dark dark:text-night-muted text-sm">
              {selectedUserId
                ? "Vorschau wird geladen..."
                : "Wählen Sie einen Benutzer aus, um die effektiven Berechtigungen zu sehen"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
