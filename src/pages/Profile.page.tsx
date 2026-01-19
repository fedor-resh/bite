import {
	ActionIcon,
	Avatar,
	Button,
	Card,
	Center,
	Container,
	Divider,
	Group,
	Modal,
	NumberInput,
	Paper,
	Space,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronLeft, IconChevronRight, IconLogout } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetUserGoalsQuery, useUpdateUserGoalsMutation } from "../api/userQueries";
import { CalorieCalculator } from "../components/Profile/CalorieCalculator";
import { useAuthStore } from "../stores/authStore";
import "dayjs/locale/ru";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import isBetween from "dayjs/plugin/isBetween";
import isoWeek from "dayjs/plugin/isoWeek";
import { supabase } from "../lib/supabase";
import type { EatenProduct } from "../types/types";
import { getFormattedDate } from "../utils/dateUtils";

dayjs.extend(isBetween);
dayjs.extend(isoWeek);
dayjs.locale("ru");

export function ProfilePage() {
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const signOut = useAuthStore((state) => state.signOut);
	const { data: userGoals, isLoading: isLoadingGoals } = useGetUserGoalsQuery();
	const { mutate: updateGoals, isPending } = useUpdateUserGoalsMutation();

	const displayName = user?.user_metadata?.full_name || user?.email || "User";
	const email = user?.email || "";
	const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

	const handleLogout = async () => {
		await signOut();
		navigate("/login");
	};

	const handleSave = (caloriesGoal: number, proteinGoal: number) => {
		if (!user?.id) {
			return;
		}

		updateGoals(
			{
				userId: user.id,
				caloriesGoal,
				proteinGoal,
			},
			{
				onSuccess: () => {
					notifications.show({
						title: "Успешно",
						message: "Цели успешно обновлены",
						color: "green",
					});
				},
				onError: () => {
					notifications.show({
						title: "Ошибка",
						message: "Не удалось обновить цели",
						color: "red",
					});
				},
			},
		);
	};

	const [currentDate, setCurrentDate] = useState(dayjs());

	const mondayOfWeek = useMemo(() => currentDate.isoWeekday(1).toDate(), [currentDate]);
	const sundayOfWeek = useMemo(() => currentDate.isoWeekday(7).toDate(), [currentDate]);

	const [datesFromTo, setDatesFromTo] = useState<[Date | null, Date | null]>([
		mondayOfWeek,
		sundayOfWeek,
	]);

	// Синхронизируем datesFromTo с currentDate при изменении недели через кнопки
	useEffect(() => {
		setDatesFromTo([mondayOfWeek, sundayOfWeek]);
	}, [mondayOfWeek, sundayOfWeek]);

	const handlePrevWeek = () => {
		setCurrentDate((prev) => prev.clone().subtract(1, "week"));
	};

	const handleNextWeek = () => {
		setCurrentDate((prev) => prev.clone().add(1, "week"));
	};

	const handleDateRangeChange = (value: [string | null, string | null] | null) => {
		if (!value) {
			setDatesFromTo([mondayOfWeek, sundayOfWeek]);
			return;
		}
		const [fromStr, toStr] = value;
		setDatesFromTo([fromStr ? new Date(fromStr) : null, toStr ? new Date(toStr) : null]);
	};

	const foodKeys = {
		all: ["foods"] as const,
		foodsInRange: (from: string | null, to: string | null) => ["foods", "range", from, to] as const,
		products: (query: string) => ["products", query] as const,
	};

	function useGetFoodsInRangeQuery(from: Date | null, to: Date | null) {
		const fromStr = from ? getFormattedDate(from) : null;
		const toStr = to ? getFormattedDate(to) : null;

		const userId = useAuthStore((state) => state.user?.id);

		const hasRange = Boolean(from && to);

		return useQuery({
			queryKey: foodKeys.foodsInRange(fromStr, toStr),
			queryFn: async () => {
				if (!userId) {
					throw new Error("User is not authenticated");
				}
				if (!from || !to || !fromStr || !toStr) {
					return [] as EatenProduct[];
				}

				const { data, error } = await supabase
					.from("eaten_products")
					.select("*")
					.eq("userId", userId)
					.gte("date", fromStr) // >= from
					.lte("date", toStr) // <= to
					.order("createdAt", { ascending: false });

				if (error) {
					throw error;
				}

				return data as EatenProduct[];
			},
			enabled: !!userId && hasRange,
		});
	}

	const [from, to] = datesFromTo;
	// const intervalDateString = from ? dayjs(from).format("YYYY-MM-DD") : null;
	const { data: intervalFoods = [] } = useGetFoodsInRangeQuery(from, to);

	const meanCaloriesInterval = useMemo(() => {
		if (!from || !to) {
			return 0;
		}

		const startDate = dayjs(from).startOf("day");
		const endDate = dayjs(to).endOf("day");

		// Фильтруем записи за выбранный интервал
		const intervalEntries = intervalFoods.filter(
			(e) => e.date && dayjs(e.date).isBetween(startDate, endDate, "day", "[]"),
		);

		// Рассчитываем общее количество калорий за интервал
		// kcalories - калории на 100г, value - вес в граммах
		const totalCaloriesPerInterval = intervalEntries.reduce((acc, el) => {
			const kcalories = el.kcalories ?? 0;
			const value = el.value ?? 0;
			return acc + (kcalories * value) / 100;
		}, 0);

		// Получаем уникальные дни интервала с записями
		const uniqueDays = new Set(intervalEntries.map((e) => e.date).filter(Boolean));

		// Среднее количество калорий в день за интервал
		const dailyCaloriesPerInterval =
			uniqueDays.size > 0 ? totalCaloriesPerInterval / uniqueDays.size : 0;

		return Math.round(dailyCaloriesPerInterval);
	}, [from, to, intervalFoods]);

	const _today = dayjs();

	const [caloriesModalOpened, { open: openCaloriesModal, close: closeCaloriesModal }] =
		useDisclosure(false);
	const [proteinModalOpened, { open: openProteinModal, close: closeProteinModal }] =
		useDisclosure(false);

	const [caloriesGoal, setCaloriesGoal] = useState<number | string>("");
	const [proteinGoal, setProteinGoal] = useState<number | string>("");

	// Инициализируем значения при открытии модального окна для калорий
	useEffect(() => {
		if (caloriesModalOpened && userGoals) {
			setCaloriesGoal(userGoals.caloriesGoal ?? "");
		}
	}, [caloriesModalOpened, userGoals]);

	// Инициализируем значения при открытии модального окна для белка
	useEffect(() => {
		if (proteinModalOpened && userGoals) {
			setProteinGoal(userGoals.proteinGoal ?? "");
		}
	}, [proteinModalOpened, userGoals]);

	const handleSaveCaloriesGoal = () => {
		if (!user?.id || !userGoals) {
			return;
		}

		const calories = typeof caloriesGoal === "string" ? Number(caloriesGoal) : caloriesGoal;

		if (!calories || calories < 1) {
			notifications.show({
				title: "Ошибка",
				message: "Пожалуйста, введите корректное значение калорий",
				color: "red",
			});
			return;
		}

		handleSave(calories, userGoals.proteinGoal);
		closeCaloriesModal();
	};

	const handleSaveProteinGoal = () => {
		if (!user?.id || !userGoals) {
			return;
		}

		const protein = typeof proteinGoal === "string" ? Number(proteinGoal) : proteinGoal;

		if (!protein || protein < 1) {
			notifications.show({
				title: "Ошибка",
				message: "Пожалуйста, введите корректное значение белка",
				color: "red",
			});
			return;
		}

		handleSave(userGoals.caloriesGoal, protein);
		closeProteinModal();
	};

	return (
		<Container size="sm" py="xl" px="0" my="0">
			<Stack gap="xl">
				<Title order={1}>Профиль</Title>

				<Paper p="xl" radius="md" withBorder>
					<Group gap="md">
						<Avatar src={avatarUrl} alt={displayName} name={displayName} radius="xl" size={50} />
						<Stack gap={0}>
							<Title order={4}>{displayName}</Title>
							{email && <Text c="dimmed">{email}</Text>}
						</Stack>
					</Group>
				</Paper>

				<Paper p="xl" radius="md" withBorder>
					<Stack gap="md">
						<Title order={4}>Средняя дневная калорийность за период</Title>

						<Card p="sm" withBorder>
							<div style={{ height: "5px" }}></div>
							<Center>
								<ActionIcon
									variant="subtle"
									c="dark.4"
									size="md"
									aria-label="Предыдущая неделя"
									onClick={handlePrevWeek}
								>
									<IconChevronLeft size={18} />
								</ActionIcon>
								<DatePickerInput
									value={datesFromTo}
									onChange={handleDateRangeChange}
									type="range"
									leftSection={<IconCalendar size={18} stroke={1.5} />}
									placeholder="Выберите интервал"
									locale="ru"
									valueFormat="DD.MM.YYYY"
								/>
								<ActionIcon
									variant="subtle"
									c="dark.4"
									size="md"
									aria-label="Следующая неделя"
									onClick={handleNextWeek}
								>
									<IconChevronRight size={18} />
								</ActionIcon>
							</Center>
							<div style={{ height: "10px" }}></div>
							<Center>
								<Text fw={600} size="lg" c="orange.6">
									{meanCaloriesInterval} ккал
								</Text>
							</Center>
						</Card>
					</Stack>
				</Paper>

				{userGoals && (
					<Paper p="xl" radius="md" withBorder>
						<Stack gap="md">
							<Title order={4}>Текущие цели</Title>
							<Group grow>
								<Paper
									p="md"
									radius="md"
									withBorder
									bd="1px solid #ff7428"
									onClick={openCaloriesModal}
									style={{ cursor: "pointer" }}
								>
									<Stack gap="0" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Калории
										</Text>
										<Divider my="3px" w="100%" />
										<Text size="xl" fw={700} c="orange.6">
											{userGoals.caloriesGoal}
										</Text>
										<Text size="xs" c="dimmed">
											ккал/день
										</Text>
									</Stack>
								</Paper>
								<Paper
									p="md"
									radius="md"
									withBorder
									bd="1px solid #3d7cff"
									onClick={openProteinModal}
									style={{ cursor: "pointer" }}
								>
									<Stack gap="0" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Белок
										</Text>
										<Divider my="3px" w="100%" />
										<Text size="xl" fw={700} c="blue.6">
											{userGoals.proteinGoal}
										</Text>
										<Text size="xs" c="dimmed">
											г/день
										</Text>
									</Stack>
								</Paper>
							</Group>
						</Stack>
					</Paper>
				)}

				<Modal opened={caloriesModalOpened} onClose={closeCaloriesModal} withCloseButton={false}>
				<form
						onSubmit={(event) => {
							event.preventDefault();
							handleSaveCaloriesGoal();
						}}
					>
					<NumberInput
						autoFocus
						onFocusCapture={(event) => {
							event.currentTarget.select();
						}}
						label="Цель по калориям"
						min={1}
						value={caloriesGoal}
						onChange={setCaloriesGoal}
						styles={{
							label: { color: "#ff7428", marginBottom: "0.5rem" },
						}}
					/>
					<Group justify="flex-end" mt="md">
						<Button type="submit" onClick={handleSaveCaloriesGoal}>Сохранить</Button>
					</Group>
					</form>
				</Modal>


				<Modal opened={proteinModalOpened} onClose={closeProteinModal} withCloseButton={false}>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							handleSaveProteinGoal();
						}}
					>
						<NumberInput
							autoFocus
							onFocusCapture={(event) => {
								event.currentTarget.select();
							}}
							label="Цель по белку (г)"
							min={1}
							value={proteinGoal}
							onChange={setProteinGoal}
							styles={{
								label: { color: "#3d7cff", marginBottom: "0.5rem" },
							}}
						/>
						<Group justify="flex-end" mt="md">
							<Button type="submit" onClick={handleSaveProteinGoal}>
								Сохранить
							</Button>
						</Group>
					</form>
				</Modal>

				{userGoals && user?.id && (
					<CalorieCalculator
						isLoading={isLoadingGoals}
						onSave={handleSave}
						isSaving={isPending}
						initialParams={userGoals}
					/>
				)}
				<Button
					variant="light"
					color="red"
					leftSection={<IconLogout size={16} />}
					onClick={handleLogout}
					fullWidth
				>
					Выйти
				</Button>
			</Stack>
			<Space h="100px" />
		</Container>
	);
}
