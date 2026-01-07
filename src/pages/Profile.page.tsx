import { IconLogout } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Container, Group, Paper, Space, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGetUserGoalsQuery, useUpdateUserGoalsMutation } from "../api/userQueries";
import { useGetWeeklyFoodsQuery } from "../api/foodQueries";
import { CalorieCalculator } from "../components/Profile/CalorieCalculator";
import { useAuthStore } from "../stores/authStore";
import type { FoodItemType } from "../components/FoodList";
import { getFormattedDate } from "../utils/dateUtils";

import {useState, useMemo} from 'react';
import { IconChevronLeft, IconChevronRight} from '@tabler/icons-react';
import { ActionIcon, Card, Center } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);
dayjs.extend(isoWeek);
dayjs.locale('ru');

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
	const currentDateString = currentDate.format('YYYY-MM-DD');
	const { data: weeklyFoods = [] } = useGetWeeklyFoodsQuery(currentDateString);
	
	const meanCalories = useMemo(() => {
		const startOfWeek = currentDate.isoWeekday(1).startOf('day');
		const endOfWeek = currentDate.isoWeekday(7).endOf('day');

		// Фильтруем записи за выбранную неделю
		const weekEntries = weeklyFoods.filter(e =>
			e.date && dayjs(e.date).isBetween(startOfWeek, endOfWeek, 'day', '[]')
		);

		// Рассчитываем общее количество калорий за неделю
		// kcalories - калории на 100г, value - вес в граммах
		const totalCaloriesPerWeek = weekEntries.reduce((acc, el) => {
			const kcalories = el.kcalories ?? 0;
			const value = el.value ?? 0;
			return acc + (kcalories * value) / 100;
		}, 0);

		// Получаем уникальные дни недели с записями
		const uniqueDays = new Set(weekEntries.map(e => e.date).filter(Boolean));
		
		// Среднее количество калорий в день за неделю
		const dailyCaloriesPerWeek = uniqueDays.size > 0 
			? totalCaloriesPerWeek / uniqueDays.size 
			: 0;

		return Math.round(dailyCaloriesPerWeek);
	}, [currentDate, weeklyFoods]);



	
	const handlePrevWeek = () => {
		setCurrentDate((prev) => prev.clone().subtract(1, 'week'))
	}

	const handleNextWeek = () => {
		setCurrentDate((prev) => prev.clone().add(1, 'week'))
	}

	return (
		<Container size="sm" py="xl" px="0" my="0">
			<Stack gap="xl">
				<Title order={1}>Профиль</Title>

				<Paper p="xs" radius="md" withBorder>
					<Group align="center" justify="flex-start" gap="xl">
						<Avatar src={avatarUrl} alt={displayName} name={displayName} radius="xl" size={50} />
						<Group align="center" gap="xl">
							<Title order={3}>{displayName}</Title>
							{email && <Text c="dimmed">{email}</Text>}
						</Group>
					</Group>
				</Paper>

				
				

    <Card p="md" withBorder>
    <Center>
	  <ActionIcon variant="default" size="lg" radius="md" onClick={handlePrevWeek}>
        <IconChevronLeft color="var(--mantine-color-red-text)" />
      </ActionIcon>
      <Card withBorder shadow="sm" padding="lg" radius="md">
        {currentDate.isoWeekday(1).startOf('day').format('D MMMM YYYY')} — {currentDate.isoWeekday(7).endOf('day').format('D MMMM YYYY')}
      </Card>
      <ActionIcon variant="default" size="lg" radius="md" onClick={handleNextWeek}>
        <IconChevronRight color="var(--mantine-color-teal-text)" />
      </ActionIcon>
      </Center>
      <Center>
	  <Card >{meanCalories} ккал</Card>
	  </Center>
      </Card>





				{userGoals && (
					<Paper p="xl" radius="md" withBorder>
						<Stack gap="md">
							<Title order={4}>Текущие цели</Title>
							<Group grow>
								<Paper p="md" radius="md" withBorder bd="1px solid #ff7428">
									<Stack gap="xs" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Калории
										</Text>
										<Text size="xl" fw={700} c="orange.6">
											{userGoals.caloriesGoal}
										</Text>
										<Text size="xs" c="dimmed">
											ккал/день
										</Text>
									</Stack>
								</Paper>
								<Paper p="md" radius="md" withBorder bd="1px solid #3d7cff">
									<Stack gap="xs" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Белок
										</Text>
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
