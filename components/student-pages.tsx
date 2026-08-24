"use client";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { applyToDrive } from "@/lib/api-client/applications";
import { deleteDocument, getDocuments } from "@/lib/api-client/documents";
import { getDrive, getDrives } from "@/lib/api-client/drives";
import { getMyApplications } from "@/lib/api-client/applications";
import { getNotifications } from "@/lib/api-client/notifications";
import { getProfile } from "@/lib/api-client/profile";
import { queryKeys } from "@/lib/queries/keys";
import {
  colors,
  DocumentUploader,
  DriveCard,
  EligibilityPanel,
  EmptyState,
  ErrorAlert,
  formatBytes,
  formatDate,
  PageHeader,
  PageSkeleton,
  ProfileForm,
  PushCard,
  StatusBadge,
  NotificationList,
} from "@/components/placement-ui";

export function StudentDashboard() {
  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  });
  const drives = useQuery({
    queryKey: queryKeys.drives({ status: "published" }),
    queryFn: () => getDrives({ status: "published" }),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  const applications = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: getMyApplications,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
  const notifications = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => getNotifications(),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });
  if (profile.isLoading || drives.isLoading || applications.isLoading)
    return <PageSkeleton />;
  if (profile.error)
    return <ErrorAlert error={profile.error} retry={() => profile.refetch()} />;
  if (drives.error)
    return <ErrorAlert error={drives.error} retry={() => drives.refetch()} />;
  const firstName = profile.data?.profile.fullName?.split(" ")[0] ?? "there";
  const active = (applications.data?.data ?? []).filter(
    (a) => a.status !== "selected" && a.status !== "rejected",
  );
  return (
    <Stack gap="6">
      <PageHeader
        title={`Hi, ${firstName}`}
        description="Your placement workspace at a glance."
      />
      <PushCard />
      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <Card.Root variant="outline">
          <Card.Body>
            <Text color={colors.muted}>Open eligible drives</Text>
            <Heading size="xl" mt="2">
              {drives.data?.data.filter(
                (d) => d.eligibility?.eligible !== false,
              ).length ?? 0}
            </Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root variant="outline">
          <Card.Body>
            <Text color={colors.muted}>Active applications</Text>
            <Heading size="xl" mt="2">
              {active.length}
            </Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root variant="outline">
          <Card.Body>
            <Text color={colors.muted}>Latest status</Text>
            <Heading size="md" mt="2" textTransform="capitalize">
              {applications.data?.data[0]?.status ?? "No applications yet"}
            </Heading>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>
      <Flex justify="space-between" align="center">
        <Heading size="md">Latest drives</Heading>
        <NextLink href="/student/drives" style={{ color: colors.accent }}>
          View all
        </NextLink>
      </Flex>
      {drives.data?.data.length ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
          {drives.data.data.slice(0, 4).map((drive) => (
            <DriveCard key={drive.id} drive={drive} />
          ))}
        </SimpleGrid>
      ) : (
        <EmptyState>No placement drives are open right now.</EmptyState>
      )}
      <Heading size="md">Recent activity</Heading>
      {notifications.data?.data.length ? (
        <NotificationList items={notifications.data.data.slice(0, 4)} />
      ) : (
        <EmptyState>Your placement notifications will appear here.</EmptyState>
      )}
    </Stack>
  );
}

export function StudentOnboarding() {
  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  });
  if (profile.isLoading) return <PageSkeleton />;
  if (profile.error)
    return <ErrorAlert error={profile.error} retry={() => profile.refetch()} />;
  return (
    <Stack gap="5" maxW="800px">
      <PageHeader
        title="Complete your placement profile"
        description="A few application-owned details help us calculate eligibility."
      />
      <Card.Root variant="outline">
        <Card.Body>
          <ProfileForm profile={profile.data!.profile} onboarding />
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}

export function StudentDrives() {
  const [filter, setFilter] = React.useState("published");
  const [search, setSearch] = React.useState("");
  const drives = useQuery({
    queryKey: queryKeys.drives({ status: filter }),
    queryFn: () =>
      getDrives({ status: filter === "published" ? "published" : undefined }),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  if (drives.isLoading) return <PageSkeleton />;
  if (drives.error)
    return <ErrorAlert error={drives.error} retry={() => drives.refetch()} />;
  const needle = search.toLowerCase();
  const list = (drives.data?.data ?? []).filter(
    (d) =>
      (filter !== "applied" || d.applied) &&
      (!needle ||
        `${d.companyName} ${d.jobRole}`.toLowerCase().includes(needle)),
  );
  return (
    <Stack gap="5">
      <PageHeader
        title="Placement drives"
        description="Discover opportunities and check your eligibility."
      />
      <Flex gap="3" wrap="wrap">
        <Button
          variant={filter === "published" ? "solid" : "outline"}
          onClick={() => setFilter("published")}
        >
          Open
        </Button>
        <Button
          variant={filter === "applied" ? "solid" : "outline"}
          onClick={() => setFilter("applied")}
        >
          Applied
        </Button>
        <Button
          variant={filter === "all" ? "solid" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Input
          maxW="280px"
          placeholder="Search company or role"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Flex>
      {list.length ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
          {list.map((drive) => (
            <DriveCard key={drive.id} drive={drive} />
          ))}
        </SimpleGrid>
      ) : (
        <EmptyState>No placement drives match your filters.</EmptyState>
      )}
    </Stack>
  );
}

export function StudentDriveDetail() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState("");
  const drive = useQuery({
    queryKey: queryKeys.drive(params.id),
    queryFn: () => getDrive(params.id),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  const apply = useMutation({
    mutationFn: () => applyToDrive(params.id, selected),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.drive(params.id) });
      qc.invalidateQueries({ queryKey: ["applications", "me"] });
    },
  });
  if (drive.isLoading) return <PageSkeleton />;
  if (drive.error)
    return <ErrorAlert error={drive.error} retry={() => drive.refetch()} />;
  const data = drive.data!;
  const canApply = Boolean(
    data.eligibility?.eligible &&
    !data.application &&
    data.drive.status === "published" &&
    data.resumeDocuments?.length,
  );
  return (
    <Stack gap="5">
      <NextLink href="/student/drives" style={{ color: colors.accent }}>
        ← Back to drives
      </NextLink>
      <PageHeader
        title={`${data.drive.companyName} · ${data.drive.jobRole}`}
        description={data.drive.description}
      />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="5">
        <Card.Root variant="outline">
          <Card.Body>
            <Stack gap="3">
              <Text>
                <b>Package:</b> {data.drive.packageText || "Not specified"}
              </Text>
              <Text>
                <b>Location:</b> {data.drive.location || "Not specified"}
              </Text>
              <Text>
                <b>Drive date:</b> {formatDate(data.drive.driveDate)}
              </Text>
              <Text>
                <b>Registration deadline:</b>{" "}
                {formatDate(data.drive.registrationDeadline)}
              </Text>
              <Text>
                <b>Status:</b> <StatusBadge status={data.drive.status} />
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
        <EligibilityPanel eligibility={data.eligibility} drive={data.drive} />
      </SimpleGrid>
      <Card.Root variant="outline">
        <Card.Header>
          <Heading size="sm">Application</Heading>
        </Card.Header>
        <Card.Body>
          <Stack gap="3">
            <Text color={colors.muted}>
              {data.application
                ? `Applied ${formatDate(data.application.appliedAt)}`
                : "Select an existing PDF resume to apply."}
            </Text>
            {data.application ? (
              <StatusBadge status={data.application.status} />
            ) : data.resumeDocuments?.length ? (
              <>
                <select
                  aria-label="Select resume"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  style={{
                    padding: 9,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 6,
                  }}
                >
                  <option value="">Choose a resume</option>
                  {data.resumeDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.originalName} · {formatBytes(doc.sizeBytes)}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!canApply || !selected}
                  loading={apply.isPending}
                  onClick={() => apply.mutate()}
                >
                  Apply
                </Button>
                {apply.error && (
                  <ErrorAlert
                    error={apply.error}
                    retry={() => drive.refetch()}
                  />
                )}
              </>
            ) : (
              <EmptyState>
                Upload a resume before applying to a drive.
              </EmptyState>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}

export function StudentApplications() {
  const query = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: getMyApplications,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
  if (query.isLoading) return <PageSkeleton />;
  if (query.error)
    return <ErrorAlert error={query.error} retry={() => query.refetch()} />;
  return (
    <Stack gap="5">
      <PageHeader
        title="Applications"
        description="Track every application and its latest server-confirmed status."
      />
      {query.data?.data.length ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
          {query.data.data.map((application) => (
            <Card.Root key={application.id} variant="outline">
              <Card.Body>
                <Stack gap="3">
                  <Flex justify="space-between" gap="3">
                    <Box>
                      <Heading size="sm">
                        {application.companyName ?? "Placement drive"}
                      </Heading>
                      <Text color={colors.muted}>
                        {application.jobRole ?? "Role"}
                      </Text>
                    </Box>
                    <StatusBadge status={application.status} />
                  </Flex>
                  <Text fontSize="sm">
                    Applied: {formatDate(application.appliedAt)}
                  </Text>
                  <Text fontSize="sm">
                    Drive date: {formatDate(application.driveDate)}
                  </Text>
                  <NextLink
                    href={`/student/drives/${application.driveId}`}
                    style={{ color: colors.accent }}
                  >
                    View drive
                  </NextLink>
                </Stack>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      ) : (
        <EmptyState>
          You haven&apos;t applied to any drives yet.
          <NextLink href="/student/drives" style={{ color: colors.accent }}>
            Browse open drives
          </NextLink>
        </EmptyState>
      )}
    </Stack>
  );
}

export function StudentDocuments() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.documents,
    queryFn: getDocuments,
  });
  const remove = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documents }),
  });
  if (query.isLoading) return <PageSkeleton />;
  if (query.error)
    return <ErrorAlert error={query.error} retry={() => query.refetch()} />;
  return (
    <Stack gap="5">
      <PageHeader
        title="Documents"
        description="Keep a current private PDF resume ready for applications."
      />
      <DocumentUploader
        onUploaded={() =>
          qc.invalidateQueries({ queryKey: queryKeys.documents })
        }
      />
      {query.data?.data.length ? (
        <Stack gap="3">
          {query.data.data.map((doc) => (
            <Card.Root key={doc.id} variant="outline">
              <Card.Body>
                <Flex
                  justify="space-between"
                  align="center"
                  gap="4"
                  wrap="wrap"
                >
                  <Box>
                    <Text fontWeight="semibold">{doc.originalName}</Text>
                    <Text fontSize="sm" color={colors.muted}>
                      {doc.type} · {formatBytes(doc.sizeBytes)} ·{" "}
                      {formatDate(doc.uploadedAt)}
                    </Text>
                  </Box>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={remove.isPending}
                    onClick={() => remove.mutate(doc.id)}
                  >
                    Delete
                  </Button>
                </Flex>
              </Card.Body>
            </Card.Root>
          ))}
        </Stack>
      ) : (
        <EmptyState>Upload a resume before applying to a drive.</EmptyState>
      )}
      {remove.error && <ErrorAlert error={remove.error} />}
    </Stack>
  );
}

export function StudentProfile() {
  const query = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  if (query.isLoading) return <PageSkeleton />;
  if (query.error)
    return <ErrorAlert error={query.error} retry={() => query.refetch()} />;
  const { profile } = query.data!;
  return (
    <Stack gap="5">
      <PageHeader
        title="Profile"
        description="Application-owned placement information."
      />
      <Card.Root variant="outline">
        <Card.Body>
          <Stack gap="5">
            <Text color={colors.muted}>
              OAuth email: {profile.email} (read-only)
            </Text>
            <ProfileForm profile={profile} />
          </Stack>
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}

export function StudentNotifications() {
  const query = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => getNotifications(),
  });
  if (query.isLoading) return <PageSkeleton />;
  if (query.error)
    return <ErrorAlert error={query.error} retry={() => query.refetch()} />;
  return (
    <Stack gap="5">
      <PageHeader
        title="Notifications"
        description="Persistent updates remain available even if browser push is disabled."
      />
      {query.data?.data.length ? (
        <NotificationList items={query.data.data} />
      ) : (
        <EmptyState>No notifications yet.</EmptyState>
      )}
    </Stack>
  );
}

import * as React from "react";
