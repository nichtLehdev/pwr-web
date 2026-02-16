"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import {
  Shield,
  Users,
  Key,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * Hardcoded list of usernames or emails allowed to manage permissions.
 */
const ALLOWED_PERMISSION_MANAGERS: string[] = [
  "lars.lehmann",
  // Add more emails/usernames here as needed
];

function canManagePermissions(
  email?: string | null,
  username?: string | null,
): boolean {
  const identifier = email || username;
  if (!identifier) return false;
  const normalized = identifier.trim().toLowerCase();
  return ALLOWED_PERMISSION_MANAGERS.some(
    (allowed) => allowed.trim().toLowerCase() === normalized,
  );
}

type Tab = "permissions" | "roles" | "users";

export default function PermissionsPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [activeTab, setActiveTab] = useState<Tab>("permissions");

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManage } = api.permissions.canManage.useQuery(undefined, {
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/permissions");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasRedirected.current &&
      canManage !== undefined
    ) {
      const allowed = canManagePermissions(profile.email, profile.username);
      if (!allowed && !canManage) {
        hasRedirected.current = true;
        redirect("/dashboard");
      }
    }
  }, [profile, profileLoading, canManage]);

  if (isPending || profileLoading || canManage === undefined) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  const allowed = canManagePermissions(profile?.email, profile?.username);
  if (!session || !profile || (!allowed && !canManage)) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              Berechtigungen
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Berechtigungsverwaltung
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Verwalte benutzerdefinierte Rollen und Berechtigungen
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-dark-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("permissions")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "permissions"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text"
              }`}
            >
              <Key className="mr-2 inline h-4 w-4" />
              Berechtigungen
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "roles"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text"
              }`}
            >
              <Shield className="mr-2 inline h-4 w-4" />
              Rollen
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "users"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text"
              }`}
            >
              <Users className="mr-2 inline h-4 w-4" />
              Benutzerzuweisungen
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "permissions" && <PermissionsTab />}
        {activeTab === "roles" && <RolesTab />}
        {activeTab === "users" && <UsersTab />}
      </div>
    </main>
  );
}

function PermissionsTab() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    category: "",
  });

  const utils = api.useUtils();
  const { data: permissions, isLoading } =
    api.permissions.getAllPermissions.useQuery();

  const createMutation = api.permissions.createPermission.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      setFormData({ key: "", name: "", description: "", category: "" });
      void utils.permissions.getAllPermissions.invalidate();
    },
  });

  const updateMutation = api.permissions.updatePermission.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setFormData({ key: "", name: "", description: "", category: "" });
      void utils.permissions.getAllPermissions.invalidate();
    },
  });

  const deleteMutation = api.permissions.deletePermission.useMutation({
    onSuccess: () => {
      void utils.permissions.getAllPermissions.invalidate();
    },
  });

  const handleEdit = (permission: NonNullable<typeof permissions>[0]) => {
    setEditingId(permission.id);
    setFormData({
      key: permission.key,
      name: permission.name,
      description: permission.description || "",
      category: permission.category || "",
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const groupedPermissions = permissions?.reduce(
    (acc, perm) => {
      const category = perm.category || "Sonstige";
      if (!acc[category]) acc[category] = [];
      acc[category]!.push(perm);
      return acc;
    },
    {} as Record<string, NonNullable<typeof permissions>>,
  );

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
          Berechtigungen
        </h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ key: "", name: "", description: "", category: "" });
            setShowCreateModal(true);
          }}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neue Berechtigung
        </button>
      </div>

      {/* Permissions List */}
      {groupedPermissions && Object.keys(groupedPermissions).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="space-y-2">
              <h3 className="dark:text-dark-text text-lg font-medium text-gray-900">
                {category}
              </h3>
              <div className="dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-dark-border">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                  <thead className="dark:bg-dark-surface bg-gray-50">
                    <tr>
                      <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Schlüssel
                      </th>
                      <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Name
                      </th>
                      <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Beschreibung
                      </th>
                      <th className="dark:text-dark-text px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:bg-dark-surface bg-white divide-y divide-gray-200 dark:divide-dark-border">
                    {perms.map((perm) => (
                      <tr key={perm.id}>
                        <td className="dark:text-dark-text whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-900">
                          {perm.key}
                        </td>
                        <td className="dark:text-dark-text px-6 py-4 text-sm text-gray-900">
                          {perm.name}
                        </td>
                        <td className="dark:text-dark-text px-6 py-4 text-sm text-gray-500">
                          {perm.description || "-"}
                        </td>
                        <td className="dark:text-dark-text whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          {perm.isSystem ? (
                            <span className="text-gray-400">System</span>
                          ) : editingId === perm.id ? (
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
                                    key: "",
                                    name: "",
                                    description: "",
                                    category: "",
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
                                onClick={() => handleEdit(perm)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Berechtigung "${perm.name}" wirklich löschen?`,
                                    )
                                  ) {
                                    deleteMutation.mutate({ id: perm.id });
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-dark-border">
          <Key className="mx-auto h-12 w-12 text-gray-400" />
          <p className="dark:text-dark-muted mt-4 text-gray-500">
            Noch keine Berechtigungen vorhanden
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              {editingId ? "Berechtigung bearbeiten" : "Neue Berechtigung"}
            </h3>
            <div className="space-y-4">
              {!editingId && (
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Schlüssel *
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) =>
                      setFormData({ ...formData, key: e.target.value })
                    }
                    placeholder="z.B. events.create"
                    className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
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
                  placeholder="z.B. Events erstellen"
                  className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Kategorie
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="z.B. events"
                  className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingId(null);
                  setFormData({
                    key: "",
                    name: "",
                    description: "",
                    category: "",
                  });
                }}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={
                  !formData.key && !editingId
                    ? !formData.name
                    : !formData.key || !formData.name
                }
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RolesTab() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  });

  const utils = api.useUtils();
  const { data: roles, isLoading } = api.permissions.getAllRoles.useQuery();
  const { data: permissions } = api.permissions.getAllPermissions.useQuery();

  const createMutation = api.permissions.createRole.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      setFormData({ name: "", description: "", permissionIds: [] });
      void utils.permissions.getAllRoles.invalidate();
    },
  });

  const updateMutation = api.permissions.updateRole.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setFormData({ name: "", description: "", permissionIds: [] });
      void utils.permissions.getAllRoles.invalidate();
    },
  });

  const deleteMutation = api.permissions.deleteRole.useMutation({
    onSuccess: () => {
      void utils.permissions.getAllRoles.invalidate();
    },
  });

  const handleEdit = (role: NonNullable<typeof roles>[0]) => {
    setEditingId(role.id);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions.map((rp) => rp.permission.id),
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formData.name,
        description: formData.description || null,
        permissionIds: formData.permissionIds,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData({
      ...formData,
      permissionIds: formData.permissionIds.includes(permissionId)
        ? formData.permissionIds.filter((id) => id !== permissionId)
        : [...formData.permissionIds, permissionId],
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
            setFormData({ name: "", description: "", permissionIds: [] });
            setShowCreateModal(true);
          }}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neue Rolle
        </button>
      </div>

      {/* Roles List */}
      {roles && roles.length > 0 ? (
        <div className="dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-dark-border">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="dark:bg-dark-surface bg-gray-50">
              <tr>
                <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Beschreibung
                </th>
                <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Berechtigungen
                </th>
                <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Benutzer
                </th>
                <th className="dark:text-dark-text px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="dark:bg-dark-surface bg-white divide-y divide-gray-200 dark:divide-dark-border">
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="dark:text-dark-text px-6 py-4 text-sm font-medium text-gray-900">
                    {role.name}
                    {role.isSystem && (
                      <span className="ml-2 text-xs text-gray-500">(System)</span>
                    )}
                  </td>
                  <td className="dark:text-dark-text px-6 py-4 text-sm text-gray-500">
                    {role.description || "-"}
                  </td>
                  <td className="dark:text-dark-text px-6 py-4 text-sm text-gray-500">
                    {role.permissions.length}
                  </td>
                  <td className="dark:text-dark-text px-6 py-4 text-sm text-gray-500">
                    {role.users.length}
                  </td>
                  <td className="dark:text-dark-text whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    {role.isSystem ? (
                      <span className="text-gray-400">System</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(role)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(`Rolle "${role.name}" wirklich löschen?`)
                            ) {
                              deleteMutation.mutate({ id: role.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-dark-border">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <p className="dark:text-dark-muted mt-4 text-gray-500">
            Noch keine Rollen vorhanden
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="dark:bg-dark-surface w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h3 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              {editingId ? "Rolle bearbeiten" : "Neue Rolle"}
            </h3>
            <div className="space-y-4">
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
                  placeholder="z.B. Content Moderator"
                  className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                  Berechtigungen
                </label>
                <div className="dark:bg-dark-surface max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-4 dark:border-dark-border">
                  {permissions && permissions.length > 0 ? (
                    <div className="space-y-2">
                      {permissions.map((perm) => (
                        <label
                          key={perm.id}
                          className="dark:text-dark-text flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissionIds.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="font-medium">{perm.name}</span>
                          <span className="text-gray-500">({perm.key})</span>
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
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingId(null);
                  setFormData({
                    name: "",
                    description: "",
                    permissionIds: [],
                  });
                }}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name}
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
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

  // Filter users based on search query
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

  // Close dropdown when clicking outside
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
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : selectedUser?.displayName || selectedUser?.email || ""}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              // Clear search when focusing if user is selected, to allow new search
              if (selectedUser) {
                setSearchQuery("");
              }
            }}
            placeholder={selectedUser && !isOpen ? undefined : placeholder}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {selectedUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!selectedUser && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="dark:bg-dark-surface absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-border">
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    [],
  );

  const utils = api.useUtils();
  const { data: users } = api.permissions.getAllUsers.useQuery();
  const { data: roles } = api.permissions.getAllRoles.useQuery();
  const { data: permissions } = api.permissions.getAllPermissions.useQuery();
  const { data: userPermissions } = api.permissions.getUserPermissions.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId },
  );

  const assignRolesMutation =
    api.permissions.assignRolesToUser.useMutation({
      onSuccess: () => {
        void utils.permissions.getUserPermissions.invalidate();
      },
    });

  const assignPermissionsMutation =
    api.permissions.assignPermissionsToUser.useMutation({
      onSuccess: () => {
        void utils.permissions.getUserPermissions.invalidate();
      },
    });

  useEffect(() => {
    if (userPermissions) {
      setSelectedRoleIds(
        userPermissions.customRoles.map((ura) => ura.role.id),
      );
      setSelectedPermissionIds(
        userPermissions.userPermissions
          .filter((up) => up.granted)
          .map((up) => up.permission.id),
      );
    }
  }, [userPermissions]);

  const handleSelectUser = (userId: string | null) => {
    setSelectedUserId(userId);
    setSelectedRoleIds([]);
    setSelectedPermissionIds([]);
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
      permissions: selectedPermissionIds.map((pid) => ({
        permissionId: pid,
        granted: true,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
        Benutzerzuweisungen
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Selection */}
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
              <div className="dark:bg-dark-surface rounded-lg border border-gray-200 p-4 dark:border-dark-border">
                <h3 className="dark:text-dark-text mb-3 text-sm font-semibold text-gray-900">
                  Rollen zuweisen
                </h3>
                {roles && roles.length > 0 ? (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="dark:text-dark-text flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleIds([
                                ...selectedRoleIds,
                                role.id,
                              ]);
                            } else {
                              setSelectedRoleIds(
                                selectedRoleIds.filter((id) => id !== role.id),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>{role.name}</span>
                      </label>
                    ))}
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
              <div className="dark:bg-dark-surface rounded-lg border border-gray-200 p-4 dark:border-dark-border">
                <h3 className="dark:text-dark-text mb-3 text-sm font-semibold text-gray-900">
                  Direkte Berechtigungen
                </h3>
                {permissions && permissions.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="dark:text-dark-text flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissionIds.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissionIds([
                                ...selectedPermissionIds,
                                perm.id,
                              ]);
                            } else {
                              setSelectedPermissionIds(
                                selectedPermissionIds.filter(
                                  (id) => id !== perm.id,
                                ),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="font-medium">{perm.name}</span>
                        <span className="text-gray-500">({perm.key})</span>
                      </label>
                    ))}
                    <button
                      onClick={handleSavePermissions}
                      className="bg-primary hover:bg-primary/90 mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
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

        {/* Current Assignments */}
        <div className="dark:bg-dark-surface rounded-lg border border-gray-200 p-4 dark:border-dark-border">
          <h3 className="dark:text-dark-text mb-3 text-sm font-semibold text-gray-900">
            Aktuelle Zuweisungen
          </h3>
          {userPermissions ? (
            <div className="space-y-4">
              <div>
                <h4 className="dark:text-dark-text mb-2 text-xs font-medium text-gray-700">
                  Rollen
                </h4>
                {userPermissions.customRoles.length > 0 ? (
                  <div className="space-y-1">
                    {userPermissions.customRoles.map((ura) => (
                      <div
                        key={ura.id}
                        className="dark:bg-dark-surface rounded bg-gray-50 px-3 py-2 text-sm"
                      >
                        {ura.role.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    Keine Rollen zugewiesen
                  </p>
                )}
              </div>
              <div>
                <h4 className="dark:text-dark-text mb-2 text-xs font-medium text-gray-700">
                  Direkte Berechtigungen
                </h4>
                {userPermissions.userPermissions.length > 0 ? (
                  <div className="space-y-1">
                    {userPermissions.userPermissions.map((up) => (
                      <div
                        key={up.id}
                        className={`dark:bg-dark-surface rounded px-3 py-2 text-sm ${
                          up.granted
                            ? "bg-green-50 text-green-700 dark:text-green-400"
                            : "bg-red-50 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {up.permission.name} ({up.permission.key})
                        {up.granted ? (
                          <Check className="ml-2 inline h-4 w-4" />
                        ) : (
                          <X className="ml-2 inline h-4 w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    Keine direkten Berechtigungen
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="dark:text-dark-muted text-sm text-gray-500">
              Wählen Sie einen Benutzer aus
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
