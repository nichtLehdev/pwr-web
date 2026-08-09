"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
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

type Tab = "roles" | "users";

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
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
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
      <div className="dark:border-dark-border mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("roles")}
            className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "roles"
                ? "border-primary text-primary"
                : "dark:text-dark-muted dark:hover:text-dark-text border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Shield className="mr-2 inline h-4 w-4" />
            Rollen
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "dark:text-dark-muted dark:hover:text-dark-text border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Users className="mr-2 inline h-4 w-4" />
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
          Rollen
        </h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "", permissionKeys: [] });
            setShowCreateModal(true);
          }}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neue Rolle
        </button>
      </div>

      {roles && roles.length > 0 ? (
        <div className="dark:bg-dark-surface dark:border-dark-border overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
          <table className="dark:divide-dark-border min-w-full divide-y divide-gray-200">
            <thead className="dark:bg-dark-surface bg-gray-50">
              <tr>
                <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Beschreibung
                </th>
                <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Berechtigungen
                </th>
                <th className="dark:text-dark-text px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="dark:bg-dark-surface dark:divide-dark-border divide-y divide-gray-200 bg-white">
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="dark:text-dark-text px-6 py-4 text-sm font-medium text-gray-900">
                    {role.name}
                    {role.isSystem && (
                      <span className="ml-2 text-xs text-gray-500">
                        (System)
                      </span>
                    )}
                  </td>
                  <td className="dark:text-dark-text px-6 py-4 text-sm text-gray-500">
                    {role.description || "-"}
                  </td>
                  <td className="dark:text-dark-text px-6 py-4 text-sm text-gray-500">
                    {role.permissions.length} Berechtigung
                    {role.permissions.length !== 1 ? "en" : ""}
                  </td>
                  <td className="dark:text-dark-text px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                    {role.isSystem && isAdminRole(role.name) ? (
                      <span className="text-gray-400">Admin</span>
                    ) : editingId === role.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-900"
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
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(role)}
                          className="text-blue-600 hover:text-blue-900"
                          title={
                            role.isSystem
                              ? "Berechtigungen bearbeiten"
                              : "Bearbeiten"
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Rolle "${role.name}" wirklich löschen?`,
                                )
                              ) {
                                deleteMutation.mutate({ id: role.id });
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <p className="dark:text-dark-muted mt-4 text-gray-500">
            Noch keine Rollen vorhanden
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingId) && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
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
                      <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="z.B. Content Manager"
                        className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-1 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
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
                        className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-1 focus:outline-none"
                      />
                    </div>
                  </>
                )}
                {isEditingSystemRole && editingId && (
                  <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    <p className="font-medium">Systemrolle: {formData.name}</p>
                    <p className="mt-1 text-xs">
                      Name und Beschreibung können nicht geändert werden.
                      Berechtigungen können angepasst werden.
                    </p>
                  </div>
                )}
                <div>
                  <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                    Berechtigungen
                  </label>
                  <div className="dark:bg-dark-surface dark:border-dark-border max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-4">
                    {permissions && permissions.length > 0 ? (
                      <div className="space-y-2">
                        {permissions.map((perm) => (
                          <label
                            key={perm.key}
                            className="dark:text-dark-text flex flex-wrap items-center gap-x-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissionKeys.includes(
                                perm.key,
                              )}
                              onChange={() => togglePermission(perm.key)}
                              className="text-primary focus:ring-primary h-4 w-4 shrink-0 rounded border-gray-300"
                            />
                            <span className="font-medium">{perm.name}</span>
                            <span className="break-all text-gray-500">
                              ({perm.key})
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="dark:text-dark-muted text-sm text-gray-500">
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
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editingId && !formData.name}
                  className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
          <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 py-2 pr-10 pl-10 focus:ring-1 focus:outline-none"
          />
          {selectedUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!selectedUser && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
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
          <div className="dark:bg-dark-surface dark:border-dark-border absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {filteredUsers.length > 0 ? (
              <div className="py-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    className={`dark:text-dark-text dark:hover:bg-dark-surface w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      selectedUserId === user.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="font-medium">
                      {user.displayName || user.email}
                    </div>
                    {user.displayName && (
                      <div className="text-xs text-gray-500">{user.email}</div>
                    )}
                    {user.username && (
                      <div className="text-xs text-gray-400">
                        @{user.username}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
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
      <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
        Benutzerzuweisungen
      </h2>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left Column: User Selection + Assignment */}
        <div className="space-y-4">
          <div>
            <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
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
              <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 p-4">
                <h3 className="dark:text-dark-text mb-3 text-sm font-semibold text-gray-900">
                  Rollen zuweisen
                </h3>
                {hasAdminRole && (
                  <div className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    <p className="font-medium">Admin-Rolle zugewiesen</p>
                    <p className="mt-1 text-xs">
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
                          className={`flex items-center gap-2 text-sm ${
                            isDisabled
                              ? "cursor-not-allowed opacity-50"
                              : "dark:text-dark-text"
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
                            className={`h-4 w-4 rounded border-gray-300 ${
                              isDisabled
                                ? "cursor-not-allowed opacity-50"
                                : "text-primary focus:ring-primary"
                            }`}
                          />
                          <span>{role.name}</span>
                        </label>
                      );
                    })}
                    <button
                      onClick={handleSaveRoles}
                      className="bg-primary hover:bg-primary/90 mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                    >
                      Rollen speichern
                    </button>
                  </div>
                ) : (
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    Keine Rollen verfügbar
                  </p>
                )}
              </div>

              {/* Direct Permission Assignment */}
              <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 p-4">
                <h3 className="dark:text-dark-text mb-3 text-sm font-semibold text-gray-900">
                  Direkte Berechtigungen
                </h3>
                {hasAdminRole && (
                  <div className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    <p className="font-medium">Admin-Rolle zugewiesen</p>
                    <p className="mt-1 text-xs">
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
                        className={`flex items-center gap-2 text-sm ${
                          hasAdminRole
                            ? "cursor-not-allowed opacity-50"
                            : "dark:text-dark-text"
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
                          className={`h-4 w-4 rounded border-gray-300 ${
                            hasAdminRole
                              ? "cursor-not-allowed opacity-50"
                              : "text-primary focus:ring-primary"
                          }`}
                        />
                        <span className="font-medium">{perm.name}</span>
                        <span className="text-gray-500">({perm.key})</span>
                      </label>
                    ))}
                    <button
                      onClick={handleSavePermissions}
                      disabled={hasAdminRole}
                      className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                        hasAdminRole
                          ? "cursor-not-allowed bg-gray-400 opacity-50"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                    >
                      Berechtigungen speichern
                    </button>
                  </div>
                ) : (
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    Keine Berechtigungen verfügbar
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Effective Permission Preview */}
        <div className="dark:bg-dark-surface dark:border-dark-border sticky top-4 max-h-[calc(100vh-6rem)] overflow-hidden rounded-lg border border-gray-200 p-4">
          <h3 className="dark:text-dark-text mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Eye className="h-4 w-4" />
            Effektive Berechtigungen
          </h3>
          {selectedUserId && groupedPreview ? (
            <div className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto">
              {Object.entries(groupedPreview).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="dark:text-dark-text mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {perms.map((perm) => (
                      <div
                        key={perm.key}
                        className={`rounded px-3 py-2 text-sm ${
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
                              className={`inline-block rounded px-1.5 py-0.5 text-xs ${
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
                <p className="dark:text-dark-muted text-sm text-gray-500">
                  Keine Berechtigungen mit aktueller Auswahl
                </p>
              )}
            </div>
          ) : (
            <p className="dark:text-dark-muted text-sm text-gray-500">
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
